/**
 * Centralized API client for Voxnote backend.
 * Packaged build: same-origin relative "/api" (FastAPI serves UI + API on one port).
 * Dev: NEXT_PUBLIC_API_BASE points at the standalone API on :8003 (see .env.development).
 */

import type {
  TranscriptionResult,
  InsightsResult,
  ExportResult,
  AppConfig,
  NoteListItem,
  NoteDetail,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

// The desktop shell injects the per-launch token on window at runtime (never NEXT_PUBLIC,
// so it is not baked into the static bundle). Dev has no token -> header omitted.
function authHeaders(): Record<string, string> {
  const t =
    (typeof window !== "undefined" &&
      (window as unknown as { __VOXNOTE_TOKEN__?: string }).__VOXNOTE_TOKEN__) ||
    undefined;
  return t ? { "X-Voxnote-Token": t } : {};
}

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

  // No Content-Type: the browser sets the multipart boundary.
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    headers: { ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ transcript_text: transcript, insights, audio_name: audio_filename }),
  });
  return handleResponse(res);
}

/** Convert a note's Markdown to a Word (.docx) document, returned as a downloadable Blob. */
export async function exportNoteDocx(
  content: string,
  filename: string
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body.detail || body.message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      detail || `Error ${res.status}: ${res.statusText}`,
      res.status,
      detail
    );
  }
  return res.blob();
}

// --- Config ---

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function updateConfig(
  config: Partial<AppConfig>
): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(config),
  });
  return handleResponse(res);
}

// --- Notes ---

export async function listNotes(): Promise<NoteListItem[]> {
  const res = await fetch(`${API_BASE}/notes`, { headers: { ...authHeaders() } });
  return handleResponse(res);
}

export async function getNote(filename: string): Promise<NoteDetail> {
  const res = await fetch(
    `${API_BASE}/notes/${encodeURIComponent(filename)}`,
    { headers: { ...authHeaders() } }
  );
  return handleResponse(res);
}

/** Replace SPEAKER_xx labels in a note with real names (persisted server-side). */
export async function renameSpeakers(
  filename: string,
  mapping: Record<string, string>
): Promise<NoteDetail> {
  const res = await fetch(
    `${API_BASE}/notes/${encodeURIComponent(filename)}/speakers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ mapping }),
    }
  );
  return handleResponse(res);
}

// --- Ollama ---

export interface OllamaModel {
  value: string;
  label: string;
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${API_BASE}/ollama/models`, { headers: { ...authHeaders() } });
  return handleResponse(res);
}
