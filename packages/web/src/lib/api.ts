/**
 * Local API client for Voxnote's web build.
 *
 * This module used to talk to the FastAPI backend (whisperX + Ollama). In the browser
 * build it is fully self-contained: transcription runs in a Web Worker via
 * transformers.js, insights come from a direct call to the user's LLM provider, notes
 * are generated client-side and persisted in IndexedDB. The function signatures match
 * the old client so the hooks/components that consume them barely change.
 */

import type {
  TranscriptionResult,
  InsightsResult,
  ExportResult,
  AppConfig,
  NoteListItem,
  NoteDetail,
} from "@/types";
import { transcribeInBrowser } from "./whisper";
import { exportNote as buildNote } from "./exporter";
import {
  listNotes as dbListNotes,
  getNote as dbGetNote,
  renameSpeakers as dbRenameSpeakers,
  saveNote,
} from "./notes-db";
import { markdownToDocxBlob } from "./docx";
import { getStoredConfig } from "./config-store";

// --- Health -----------------------------------------------------------------

export async function checkHealth(): Promise<{ status: string }> {
  // No backend to ping; the app is self-contained. Always healthy.
  return { status: "ok" };
}

// --- Transcription ----------------------------------------------------------

export interface TranscribeOptions {
  model?: string;
  language?: string;
  diarize?: boolean; // accepted for API compatibility; diarization is not supported in-browser
  onProgress?: (progress: number, file?: string) => void;
}

export async function transcribeAudio(
  audio: Blob,
  options: TranscribeOptions = {},
): Promise<TranscriptionResult> {
  return transcribeInBrowser(audio, {
    model: options.model,
    language: options.language,
    onProgress: options.onProgress,
  });
}

// --- Insights ---------------------------------------------------------------

export async function extractInsights(
  text: string,
  provider: string = "openai",
): Promise<InsightsResult> {
  const cfg = getStoredConfig();
  const keyForProvider: Record<string, string> = {
    openai: cfg.api_key_openai,
    anthropic: cfg.api_key_anthropic,
    google: cfg.api_key_google,
    zai: cfg.api_key_zai,
    kimi: cfg.api_key_kimi,
  };
  const modelForProvider: Record<string, string> = {
    openai: cfg.openai_model,
    anthropic: cfg.anthropic_model,
    google: cfg.google_model,
    zai: cfg.zai_model,
    kimi: cfg.kimi_model,
  };
  const key = keyForProvider[provider] ?? "";
  const model = modelForProvider[provider] ?? "";
  const { extractInsightsInBrowser } = await import("./insights");
  return extractInsightsInBrowser(text, {
    provider: provider as "openai" | "anthropic" | "google" | "zai" | "kimi",
    apiKey: key,
    model,
    language: cfg.language,
  });
}

// --- Export -----------------------------------------------------------------

export async function exportNote(
  transcript: string,
  insights: InsightsResult,
  audio_filename?: string,
): Promise<ExportResult> {
  const note = buildNote(transcript, insights, audio_filename || "recording.wav");
  // Persist to IndexedDB so the History tab picks it up.
  await saveNote(note.filename, note.content).catch(() => {
    // Non-fatal: the note is still returned to the caller for immediate preview.
  });
  return note;
}

/** Convert a note's Markdown to a Word (.docx) document, returned as a downloadable Blob. */
export async function exportNoteDocx(
  content: string,
  filename: string,
): Promise<Blob> {
  return markdownToDocxBlob(content, filename);
}

// --- Config -----------------------------------------------------------------

export async function fetchConfig(): Promise<AppConfig> {
  return getStoredConfig();
}

export async function updateConfig(_config: Partial<AppConfig>): Promise<AppConfig> {
  // Config writes go straight to localStorage via the hook; no-op here for compat.
  return getStoredConfig();
}

// --- Notes ------------------------------------------------------------------

export async function listNotes(): Promise<NoteListItem[]> {
  return dbListNotes();
}

export async function getNote(filename: string): Promise<NoteDetail> {
  return dbGetNote(filename);
}

/** Replace SPEAKER_xx labels in a note with real names (persisted in IndexedDB). */
export async function renameSpeakers(
  filename: string,
  mapping: Record<string, string>,
): Promise<NoteDetail> {
  return dbRenameSpeakers(filename, mapping);
}

/** Bundle every stored note into a single ZIP download (each note = one .md file). */
export async function exportAllNotes(): Promise<Blob> {
  const { exportAllNotes: zip } = await import("./notes-db");
  return zip();
}

/** Delete every stored note (the whole history). */
export async function clearAllNotes(): Promise<void> {
  const { clearAllNotes: clear } = await import("./notes-db");
  return clear();
}
