/**
 * Centralized API client for Voxnote backend.
 * All requests go through Next.js rewrites → FastAPI on :8003.
 */

import type {
  TranscriptionResult,
  InsightsResult,
  ExportResult,
  AppConfig,
  NoteListItem,
  NoteDetail,
} from "@/types";

const API_BASE = "http://localhost:8003/api";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      detail = body.detail || body.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      detail || `Error ${response.status}: ${response.statusText}`,
      response.status,
      detail
    );
  }
  return response.json();
}

// --- Health ---

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

// --- Transcription ---

export interface TranscribeOptions {
  model?: string;
  language?: string;
  diarize?: boolean;
}

export async function transcribeAudio(
  audio: Blob,
  options: TranscribeOptions = {}
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("audio", audio, "recording.wav");
  formData.append("model", options.model || "turbo");
  formData.append("language", options.language || "es");
  formData.append("diarize", String(options.diarize || false));

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

// --- Insights ---

export async function extractInsights(
  text: string,
  provider: string = "ollama"
): Promise<InsightsResult> {
  const res = await fetch(`${API_BASE}/insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, provider }),
  });
  return handleResponse(res);
}

// --- Export ---

export async function exportNote(
  transcript: string,
  insights: InsightsResult,
  audio_filename?: string
): Promise<ExportResult> {
  const res = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript_text: transcript, insights, audio_name: audio_filename }),
  });
  return handleResponse(res);
}

// --- Config ---

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`);
  return handleResponse(res);
}

export async function updateConfig(
  config: Partial<AppConfig>
): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return handleResponse(res);
}

// --- Notes ---

export async function listNotes(): Promise<NoteListItem[]> {
  const res = await fetch(`${API_BASE}/notes`);
  return handleResponse(res);
}

export async function getNote(filename: string): Promise<NoteDetail> {
  const res = await fetch(
    `${API_BASE}/notes/${encodeURIComponent(filename)}`
  );
  return handleResponse(res);
}

// --- Ollama ---

export interface OllamaModel {
  value: string;
  label: string;
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${API_BASE}/ollama/models`);
  return handleResponse(res);
}
