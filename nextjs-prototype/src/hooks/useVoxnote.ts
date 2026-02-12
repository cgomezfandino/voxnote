"use client";

import { useState, useCallback } from "react";

interface TranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
}

interface InsightsResult {
  resumen: string;
  decisiones: string[];
  action_items: string[];
  insights: string[];
  preguntas_abiertas: string[];
  proximos_pasos: string[];
}

export function useVoxnote() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(
    async (
      audioBlob: Blob,
      options: {
        model?: string;
        language?: string;
        diarize?: boolean;
      } = {}
    ): Promise<TranscriptionResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");
        formData.append("model", options.model || "turbo");
        formData.append("language", options.language || "es");
        formData.append("diarize", String(options.diarize || false));

        // En producción, esto apunta al backend Python
        const response = await fetch("/api/v1/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Error en la transcripción");
        }

        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const extractInsights = useCallback(
    async (
      text: string,
      provider: string = "ollama"
    ): Promise<InsightsResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, provider }),
        });

        if (!response.ok) {
          throw new Error("Error extrayendo insights");
        }

        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const exportNote = useCallback(
    async (
      insights: InsightsResult,
      transcript: TranscriptionResult,
      filename: string
    ): Promise<Blob> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            insights,
            transcript,
            filename,
            format: "markdown",
          }),
        });

        if (!response.ok) {
          throw new Error("Error exportando nota");
        }

        return await response.blob();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    transcribe,
    extractInsights,
    exportNote,
    isLoading,
    error,
  };
}
