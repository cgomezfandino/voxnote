"use client";

import { useState, useCallback } from "react";
import type { AppConfig } from "@/types";
import { getStoredConfig, patchStoredConfig } from "@/lib/config-store";

export function useConfig() {
  // Config is read synchronously from localStorage via a lazy initializer — no fetch,
  // no effect — so it is already loaded on the first render. SSR-safe: getStoredConfig
  // returns defaults when window is undefined.
  const [config, setConfig] = useState<AppConfig>(() => getStoredConfig());
  const [isSyncing, setIsSyncing] = useState(false);

  const updateField = useCallback(
    <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        // Persist immediately. localStorage writes are synchronous and cheap; the brief
        // "Saved" pulse mirrors the old backend-sync indicator for visual continuity.
        patchStoredConfig({ [key]: value });
        return next;
      });
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 250);
    },
    [],
  );

  return {
    config,
    isLoaded: true,
    isSyncing,
    updateField,
  };
}
