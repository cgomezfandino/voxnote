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
  openai_model: "gpt-4o-mini",
  kimi_model: "moonshot-v1-8k",
  glm_model: "glm-4",
  google_model: "gemini-2.0-flash-exp",
  output_dir: "output",
  diarize: false,
  hf_token: "",
};

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced sync to backend
  const syncToBackend = useCallback((updates: Partial<AppConfig>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await apiUpdateConfig(updates);
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
