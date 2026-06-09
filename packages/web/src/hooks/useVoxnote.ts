"use client";

import { useState, useCallback } from "react";
import type {
  TranscriptionResult,
  InsightsResult,
  ExportResult,
  ProcessingStep,
} from "@/types";
import {
  transcribeAudio,
  extractInsights as apiExtractInsights,
  exportNote,
  type TranscribeOptions,
} from "@/lib/api";

const INITIAL_STEPS: ProcessingStep[] = [
  { id: 1, title: "Transcribiendo audio...", status: "pending" },
  { id: 2, title: "Extrayendo insights...", status: "pending" },
  { id: 3, title: "Generando nota...", status: "pending" },
];

export function useVoxnote() {
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updateStep = useCallback(
    (id: number, updates: Partial<ProcessingStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const transcribe = useCallback(
    async (
      audioBlob: Blob,
      options: TranscribeOptions = {}
    ): Promise<TranscriptionResult> => {
      setIsLoading(true);
      setError(null);
      setSteps(
        INITIAL_STEPS.map((s) =>
          s.id === 1 ? { ...s, status: "active" as const } : s
        )
      );

      try {
        const result = await transcribeAudio(audioBlob, options);

        updateStep(1, {
          status: "completed",
          description: `${result.text.length} caracteres`,
        });

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error en transcripción";
        updateStep(1, { status: "error", description: message });
        setError(message);
        throw err;
      }
    },
    [updateStep]
  );

  const extractInsights = useCallback(
    async (
      text: string,
      provider: string = "ollama"
    ): Promise<InsightsResult> => {
      updateStep(2, { status: "active" });

      try {
        const result = await apiExtractInsights(text, provider);

        updateStep(2, {
          status: "completed",
          description: `${result.action_items?.length || 0} tareas encontradas`,
        });

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error extrayendo insights";
        updateStep(2, { status: "error", description: message });
        setError(message);
        throw err;
      }
    },
    [updateStep]
  );

  const generateNote = useCallback(
    async (
      transcript: string,
      insights: InsightsResult,
      audioFilename?: string
    ): Promise<ExportResult> => {
      updateStep(3, { status: "active" });

      try {
        const result = await exportNote(transcript, insights, audioFilename);

        updateStep(3, {
          status: "completed",
          description: result.filename,
        });

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error generando nota";
        updateStep(3, { status: "error", description: message });
        setError(message);
        throw err;
      }
    },
    [updateStep]
  );

  const processAudio = useCallback(
    async (
      audioBlob: Blob,
      options: TranscribeOptions & { provider?: string; audioFilename?: string } = {}
    ): Promise<{
      transcription: TranscriptionResult;
      insights: InsightsResult;
      note: ExportResult;
    }> => {
      setIsLoading(true);
      setError(null);

      try {
        const transcription = await transcribe(audioBlob, {
          model: options.model,
          language: options.language,
          diarize: options.diarize,
        });

        const insights = await extractInsights(
          transcription.text,
          options.provider
        );

        const note = await generateNote(
          transcription.text,
          insights,
          transcription.audio_filename || options.audioFilename
        );

        return { transcription, insights, note };
      } finally {
        setIsLoading(false);
      }
    },
    [transcribe, extractInsights, generateNote]
  );

  const reset = useCallback(() => {
    setSteps([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    transcribe,
    extractInsights,
    generateNote,
    processAudio,
    reset,
    isLoading,
    steps,
    error,
  };
}
