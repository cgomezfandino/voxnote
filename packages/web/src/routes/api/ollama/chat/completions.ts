import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin CORS proxy for Ollama Cloud (POST /api/ollama/chat/completions
 * → https://ollama.com/v1/chat/completions). Ollama returns no CORS headers,
 * so the browser cannot call it directly.
 *
 * Hardening vs the old Pages Function:
 *  - the caller's key is forwarded verbatim and never logged or stored;
 *  - request bodies are size-capped while streaming (no unbounded text());
 *  - upstream calls time out instead of hanging a Worker invocation;
 *  - only production/preview app origins may use it (not a public relay).
 */

const UPSTREAM = "https://ollama.com/v1/chat/completions";
const MAX_BODY_BYTES = 128 * 1024; // transcripts are truncated to 8k chars upstream of this
const UPSTREAM_TIMEOUT_MS = 60_000;

const EXACT_ORIGINS = new Set([
  "https://voxnote.pages.dev",
  "http://localhost:3001",
  "http://localhost:3007",
]);

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("Origin") ?? "";
  if (EXACT_ORIGINS.has(origin)) return origin;
  try {
    const url = new URL(origin);
    if (
      url.protocol === "https:" &&
      (url.hostname === "voxnote.pages.dev" ||
        url.hostname.endsWith(".voxnote.pages.dev"))
    ) {
      return origin;
    }
  } catch {
    // fall through to the production origin (browser will block the read)
  }
  return "https://voxnote.pages.dev";
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}

function jsonError(request: Request, status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

/** Read a request body with a hard byte cap (streaming, not unbounded text()). */
async function readBodyCapped(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export const Route = createFileRoute("/api/ollama/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const auth = request.headers.get("Authorization");
        if (!auth) return jsonError(request, 401, "Missing Authorization header");

        const body = await readBodyCapped(request);
        if (body === null) {
          return jsonError(request, 413, "Request body too large");
        }

        let upstream: Response;
        try {
          upstream = await fetch(UPSTREAM, {
            method: "POST",
            headers: {
              Authorization: auth,
              "Content-Type":
                request.headers.get("Content-Type") ?? "application/json",
            },
            body,
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          });
        } catch {
          // Never include the error object: it must not echo headers/body.
          return jsonError(request, 502, "Upstream fetch failed");
        }

        const headers = new Headers(upstream.headers);
        for (const [k, v] of Object.entries(corsHeaders(request))) {
          headers.set(k, v);
        }
        return new Response(upstream.body, {
          status: upstream.status,
          headers,
        });
      },
    },
  },
});
