import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * Security headers for every SSR/API response from the Worker.
 * Static assets are covered by public/_headers (Workers static assets).
 *
 * CSP notes: unlike the old Next static export, TanStack/Vite emits no
 * inline Flight scripts. The framework's own streaming scripts get a
 * per-request cryptographic nonce (router reads it via
 * getGlobalStartContext and stamps nonce attributes + a csp-nonce meta),
 * so 'unsafe-inline' is not needed in script-src. 'wasm-unsafe-eval' +
 * blob: are required by onnxruntime-web (Whisper). connect-src is the real
 * exfiltration guard for the BYO API keys in localStorage: only the LLM
 * providers + Hugging Face. style-src keeps 'unsafe-inline' because
 * Tailwind/framer-motion set inline styles at runtime.
 */

function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function securityHeaders(nonce: string): Record<string, string> {
  return {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "credentialless",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "microphone=(self), camera=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src 'self' 'wasm-unsafe-eval' blob: 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' blob: https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.moonshot.ai https://huggingface.co https://*.hf.co https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  };
}

const securityMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next }) => {
    const nonce = newNonce();
    const result = await next({ context: { nonce } });
    for (const [k, v] of Object.entries(securityHeaders(nonce))) {
      result.response.headers.set(k, v);
    }
    return result;
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware],
}));
