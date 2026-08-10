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
  { id: 1, title: "Transcribing audio...", status: "pending" },
  { id: 2, title: "Extracting insights...", status: "pending" },
  { id: 3, title: "Generating note...", status: "pending" },
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
        const result = await transcribeAudio(audioBlob, {
          model: options.model,
          language: options.language,
          diarize: options.diarize,
          // Surface the (slow) first-time model download to the user via the step's
          // description field, so ProcessingSteps shows e.g. "Downloading 42%".
          onProgress: (progress, file) => {
            if (file && progress > 0 && progress < 100) {
              const name = file.split("/").pop() ?? file;
              updateStep(1, {
                description: `Downloading model… ${progress}% · ${name}`,
              });
            } else if (progress === 0) {
              updateStep(1, { description: "Preparing audio…" });
            }
          },
        });

        updateStep(1, {
          status: "completed",
          description: `${result.text.length} characters`,
        });

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription error";
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
          description: `${result.action_items?.length || 0} tasks found`,
        });

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error extracting insights";
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
          err instanceof Error ? err.message : "Error generating note";
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
