import { createFileRoute } from "@tanstack/react-router";
import { relayTo } from "../../../../lib/llm-proxy.server";

/**
 * POST /api/zai/chat/completions → https://api.z.ai/api/paas/v4/chat/completions.
 * Z.ai answers the CORS preflight without Access-Control-Allow-Origin, so the
 * browser blocks direct calls; it goes through this same-origin relay instead
 * (see lib/llm-proxy.server.ts for the hardening).
 */
export const Route = createFileRoute("/api/zai/chat/completions")({
  server: {
    handlers: {
      POST: relayTo("https://api.z.ai/api/paas/v4/chat/completions"),
    },
  },
});
