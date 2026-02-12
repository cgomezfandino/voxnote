"use client";

import { useState, useCallback } from "react";
import type { TranscriptionResult, InsightsResult, ProcessingStep } from "@/types";

export function useVoxnote() {
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async (
    audioBlob: Blob,
    options: { model?: string; language?: string; diarize?: boolean } = {}
  ): Promise<TranscriptionResult> => {
    setIsLoading(true);
    setError(null);
    
    setSteps([
      { id: 1, title: "Transcribiendo audio...", status: "active" },
      { id: 2, title: "Extrayendo insights...", status: "pending" },
      { id: 3, title: "Generando nota...", status: "pending" },
    ]);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("model", options.model || "turbo");
      formData.append("language", options.language || "es");
      formData.append("diarize", String(options.diarize || false));

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error en transcripción");
      
      const result = await response.json();
      
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 1 ? { ...s, status: "completed", description: `✓ ${result.text.length} caracteres` } : s
        )
      );
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const extractInsights = useCallback(async (
    text: string,
    provider: string = "ollama"
  ): Promise<InsightsResult> => {
    setSteps((prev) =>
      prev.map((s) => (s.id === 2 ? { ...s, status: "active" } : s))
    );

    const response = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, provider }),
    });

    if (!response.ok) throw new Error("Error extrayendo insights");
    
    const result = await response.json();
    
    setSteps((prev) =>
      prev.map((s) => (s.id === 2 ? { ...s, status: "completed" } : s))
    );
    
    return result;
  }, []);

  return {
    transcribe,
    extractInsights,
    isLoading,
    steps,
    error,
  };
}
