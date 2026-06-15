"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AppConfig } from "@/types";
import { fetchConfig, updateConfig as apiUpdateConfig } from "@/lib/api";

const DEFAULT_CONFIG: AppConfig = {
  whisper_model: "turbo",
  language: "es",
  llm_provider: "ollama",
  ollama_model: "llama3.1:8b",
  ollama_url: "http://localhost:11434",
  ollama_api_key: "",
  openai_model: "gpt-4o-mini",
  google_model: "gemini-2.0-flash",
  anthropic_model: "claude-opus-4-8",
  output_dir: "output",
  diarize: false,
};

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<Partial<AppConfig>>({});

  // Load config from backend on mount
  useEffect(() => {
    fetchConfig()
      .then((data) => {
        setConfig(data);
        setIsLoaded(true);
      })
      .catch(() => {
        // Backend not available, use defaults
        setIsLoaded(true);
      });
  }, []);

  // Debounced sync to backend — accumulates all fields changed within the window
  // into a single PUT (so e.g. a provider switch + its URL go together).
  const syncToBackend = useCallback((updates: Partial<AppConfig>) => {
    pendingRef.current = { ...pendingRef.current, ...updates };
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const payload = pendingRef.current;
      pendingRef.current = {};
      setIsSyncing(true);
      try {
        await apiUpdateConfig(payload);
      } catch {
        // Silently fail - config is local too
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  }, []);

  const updateField = useCallback(
    <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        syncToBackend({ [key]: value });
        return next;
      });
    },
    [syncToBackend]
  );

  return {
    config,
    isLoaded,
    isSyncing,
    updateField,
  };
}
