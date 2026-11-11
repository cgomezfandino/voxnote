/**
 * Same-origin relay for LLM providers that the browser cannot call directly
 * (no CORS support): Ollama Cloud and Z.ai.
 *
 * Each route binds ONE fixed upstream URL — the client never chooses where the
 * request goes, so this cannot be turned into an SSRF / open proxy.
 *
 * Hardening:
 *  - only same-origin browser requests are accepted (Origin must equal the
 *    Worker's own origin, and Sec-Fetch-Site must not be cross-site). This
 *    stops other websites from using the relay through a visitor's browser.
 *    A non-browser client can still forge Origin, but then it is only relaying
 *    its own key to a fixed provider endpoint;
 *  - the caller's key is forwarded verbatim and never logged or stored;
 *  - request bodies are size-capped while streaming (no unbounded text());
 *  - upstream calls time out instead of hanging a Worker invocation;
 *  - only Content-Type is copied back from upstream (no Set-Cookie etc.).
 */

const MAX_BODY_BYTES = 128 * 1024; // transcripts are truncated to 8k chars before this
const UPSTREAM_TIMEOUT_MS = 90_000;

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error: { message: error } }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** True only for requests issued by this app's own pages. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) return false;
  const site = request.headers.get("Sec-Fetch-Site");
  // Absent on very old browsers; when present it must not be cross-site.
  return site === null || site === "same-origin";
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

/** Build the POST handler for a route that relays to `upstream`. */
export function relayTo(upstream: string) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    if (!isSameOrigin(request)) return jsonError(403, "Forbidden origin");

    const auth = request.headers.get("Authorization");
    if (!auth || !/^Bearer \S+$/.test(auth)) {
      return jsonError(401, "Missing or malformed Authorization header");
    }

    const body = await readBodyCapped(request);
    if (body === null) return jsonError(413, "Request body too large");

    let res: Response;
    try {
      res = await fetch(upstream, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch {
      // Never include the error object: it must not echo headers/body.
      return jsonError(502, "Upstream request failed or timed out");
    }

    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  };
}
