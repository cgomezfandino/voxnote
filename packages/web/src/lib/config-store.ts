/**
 * LocalStorage-backed config store. The web build has no backend, so settings live in
 * the browser only. API keys are stored here too — they never leave the user's machine
 * (except as direct calls to the chosen LLM provider, which is the whole point).
 */

import type { AppConfig } from "@/types";

const STORAGE_KEY = "voxnote:config";

export const DEFAULT_CONFIG: AppConfig = {
  whisper_model: "distil",
  language: "es",
  llm_provider: "openai",
  openai_model: "gpt-4o-mini",
  google_model: "gemini-2.0-flash",
  anthropic_model: "claude-opus-4-8",
  zai_model: "glm-4.6",
  kimi_model: "kimi-k2.6",
  api_key_openai: "",
  api_key_anthropic: "",
  api_key_google: "",
  api_key_zai: "",
  api_key_kimi: "",
};

/** Read the merged config (stored values override defaults). Safe during SSR. */
export function getStoredConfig(): AppConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CONFIG };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Persist the full config object. */
export function setStoredConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage may be full or disabled (private mode). Fail silently — the app still
    // works for the session, it just won't remember settings across reloads.
  }
}

/** Merge a partial update into the stored config. */
export function patchStoredConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...getStoredConfig(), ...patch };
  setStoredConfig(next);
  return next;
}
