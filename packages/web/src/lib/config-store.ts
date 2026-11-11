/**
 * Browser config store. The web build has no backend, so settings live in the
 * browser only. API keys never leave the user's machine except as direct
 * calls to the chosen LLM provider.
 *
 * Key storage modes:
 *  - "local" (default, legacy behaviour): keys persist in localStorage.
 *    Convenient, but any XSS in this origin can read them — the strict CSP
 *    in src/start.ts is the main mitigation.
 *  - "session": keys live only in sessionStorage (cleared when the tab
 *    closes) and are stripped from the localStorage copy. Non-secret
 *    settings still persist locally.
 */

import type { AppConfig } from "@/types";

const STORAGE_KEY = "voxnote:config";
const SESSION_KEYS_KEY = "voxnote:session-keys";
const KEY_MODE_KEY = "voxnote:key-mode";

export type KeyStorageMode = "local" | "session";

const KEY_FIELDS = [
  "api_key_openai",
  "api_key_anthropic",
  "api_key_google",
  "api_key_zai",
  "api_key_kimi",
  "api_key_ollama",
] as const;

export const DEFAULT_CONFIG: AppConfig = {
  whisper_model: "turbo",
  language: "es",
  // On-device and keyless: works out of the box in desktop Chrome. Other
  // browsers are told to pick a provider (Settings checks availability).
  llm_provider: "chrome",
  openai_model: "gpt-4o-mini",
  google_model: "gemini-2.5-flash",
  anthropic_model: "claude-sonnet-5-5",
  zai_model: "glm-4.6",
  kimi_model: "kimi-k2.6",
  ollama_model: "gemma4:31b",
  ollama_local_url: "http://localhost:11434",
  ollama_local_model: "",
  api_key_openai: "",
  api_key_anthropic: "",
  api_key_google: "",
  api_key_zai: "",
  api_key_kimi: "",
  api_key_ollama: "",
};

export function getKeyStorageMode(): KeyStorageMode {
  if (typeof window === "undefined") return "local";
  try {
    return window.localStorage.getItem(KEY_MODE_KEY) === "session"
      ? "session"
      : "local";
  } catch {
    return "local";
  }
}

/** Switch key storage mode, migrating any stored keys to the new location. */
export function setKeyStorageMode(mode: KeyStorageMode): AppConfig {
  const current = getStoredConfig();
  try {
    window.localStorage.setItem(KEY_MODE_KEY, mode);
  } catch {
    // storage unavailable — mode just won't persist
  }
  setStoredConfig(current);
  return getStoredConfig();
}

function readSessionKeys(): Partial<AppConfig> {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEYS_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
  } catch {
    return {};
  }
}

/** Read the merged config (stored values override defaults). Safe during SSR. */
export function getStoredConfig(): AppConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CONFIG };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
    const merged = { ...DEFAULT_CONFIG, ...parsed };
    if (getKeyStorageMode() === "session") {
      const session = readSessionKeys();
      for (const f of KEY_FIELDS) {
        const v = session[f];
        if (typeof v === "string") merged[f] = v;
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Persist the full config object, honouring the key storage mode. */
export function setStoredConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  try {
    if (getKeyStorageMode() === "session") {
      const session: Partial<AppConfig> = {};
      const localCopy: AppConfig = { ...config };
      for (const f of KEY_FIELDS) {
        session[f] = config[f];
        localCopy[f] = "";
      }
      window.sessionStorage.setItem(SESSION_KEYS_KEY, JSON.stringify(session));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localCopy));
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      window.sessionStorage.removeItem(SESSION_KEYS_KEY);
    }
  } catch {
    // localStorage may be full or disabled (private mode). Fail silently — the
    // app still works for the session, it just won't remember settings.
  }
}

/** Merge a partial update into the stored config. */
export function patchStoredConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...getStoredConfig(), ...patch };
  setStoredConfig(next);
  return next;
}

/** Remove every stored API key from both storages. Returns the cleared config. */
export function clearApiKeys(): AppConfig {
  const patch: Partial<AppConfig> = {};
  for (const f of KEY_FIELDS) patch[f] = "";
  try {
    window.sessionStorage.removeItem(SESSION_KEYS_KEY);
  } catch {
    // ignore
  }
  return patchStoredConfig(patch);
}
