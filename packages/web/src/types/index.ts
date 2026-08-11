// Transcription types
export interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TranscriptionResult {
  text: string;
  segments: Segment[];
  has_speakers: boolean;
  audio_filename?: string;
}

// Insights types
export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
}

export interface Participant {
  speaker: string;
  contribution?: string;
}

export interface Highlight {
  speaker?: string;
  quote: string;
}

export interface InsightsResult {
  // Short, human-readable title (3-6 words) derived from the meeting topic. Used as the
  // note's display name and filename slug so the history reads "Q3 Budget Review" instead
  // of "recording".
  title: string;
  summary: string;
  participants?: Participant[];
  key_points?: string[];
  decisions: string[];
  action_items: ActionItem[];
  insights: string[];
  highlights?: Highlight[];
  open_questions: string[];
  next_steps: string[];
}

// Export types
export interface ExportResult {
  filename: string;
  content: string;
  path: string;
}

// Notes types
export interface NoteListItem {
  filename: string;
  created_at: string;
  preview: string;
  size_bytes: number;
  /** Human-readable title parsed from the note's H1, for display in the history list. */
  title: string;
}

export interface NoteDetail {
  filename: string;
  content: string;
  created_at: string;
}

// Config types
//
// The web app runs entirely in the browser — no backend. LLM providers are called
// directly with the user's own API key, stored in localStorage (never baked into the
// bundle). Speaker diarization (pyannote) is a local-only feature and not represented
// here.
export interface AppConfig {
  whisper_model: string; // base | small | turbo
  language: string; // ISO code, e.g. "es"
  llm_provider: string; // openai | anthropic | google
  openai_model: string;
  google_model: string;
  anthropic_model: string;
  api_key_openai: string;
  api_key_anthropic: string;
  api_key_google: string;
}

// Processing steps
export type StepStatus = "pending" | "active" | "completed" | "error";

export interface ProcessingStep {
  id: number;
  title: string;
  status: StepStatus;
  description?: string;
}
