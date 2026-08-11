/**
 * Cloudflare Pages Function — same-origin CORS proxy for Ollama Cloud.
 *
 * Ollama Cloud (https://ollama.com/v1/chat/completions) is OpenAI-compatible and
 * Bearer-auth, but its responses have NO Access-Control-Allow-Origin header, so a
 * browser fetch from the static site is blocked by CORS. This function runs on the
 * same origin as the Pages site (/api/ollama), forwards the request to Ollama with
 * the caller's own Authorization header, and stamps CORS headers on the response.
 *
 * The user's API key is never stored: it transits the Worker verbatim and is discarded
 * once the response is returned. The Worker adds no secret of its own.
 */

const UPSTREAM = "https://ollama.com/v1/chat/completions";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function onRequestOptions() {
  // Preflight: Cloudflare requires a 2xx with the CORS headers for the browser to proceed.
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context: { request: Request }) {
  const { request } = context;

  // The caller (the browser, on behalf of the user) sends their own Ollama Bearer key.
  const auth = request.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Forward the body untouched — it is already an OpenAI-compatible chat/completions
  // payload (messages, model, response_format, temperature…).
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
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  // Pass the upstream body through, adding CORS headers so the browser accepts it.
  const responseHeaders = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
