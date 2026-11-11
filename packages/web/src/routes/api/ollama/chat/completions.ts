import { createFileRoute } from "@tanstack/react-router";
import { relayTo } from "../../../../lib/llm-proxy.server";

/**
 * POST /api/ollama/chat/completions → https://ollama.com/v1/chat/completions.
 * Ollama Cloud sends no CORS headers, so the browser goes through this
 * same-origin relay (see lib/llm-proxy.server.ts for the hardening).
 */
export const Route = createFileRoute("/api/ollama/chat/completions")({
  server: {
    handlers: {
      POST: relayTo("https://ollama.com/v1/chat/completions"),
    },
  },
});
