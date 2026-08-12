/**
 * Cloudflare Pages Function — same-origin CORS proxy for Ollama Cloud.
 *
 * Route: POST /api/ollama/chat/completions → https://ollama.com/v1/chat/completions
 *
 * Ollama Cloud is OpenAI-compatible but returns no Access-Control-Allow-Origin, so
 * browser calls are blocked by CORS. This same-origin proxy forwards the request with
 * the caller's own Authorization header and stamps CORS headers on the response. The
 * user's API key transits the Worker verbatim and is never stored.
 */

const UPSTREAM = "https://ollama.com/v1/chat/completions";

// Only allow the app's own origins to use this proxy, so third-party sites can't abuse
// it as a free CORS relay to ollama.com. Preview deployments (*.voxnote.pages.dev) and
// the production domain are allowed.
const ALLOWED_ORIGINS = new Set([
  "https://voxnote.pages.dev",
  "http://localhost:3001",
  "http://localhost:3007",
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) || origin.endsWith(".voxnote.pages.dev")
    ? origin
    : ALLOWED_ORIGINS.values().next().value!;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Vary": "Origin",
  };
}

export async function onRequestOptions(context: { request: Request }) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context: { request: Request }) {
  const { request } = context;
  const headers = corsHeaders(request);

  const auth = request.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": request.headers.get("Content-Type") ?? "application/json",
      },
      body,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Upstream fetch failed" }),
      { status: 502, headers: { "Content-Type": "application/json", ...headers } },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(headers)) responseHeaders.set(k, v);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
