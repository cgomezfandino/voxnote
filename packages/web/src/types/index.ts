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
}

export interface NoteDetail {
  filename: string;
  content: string;
  created_at: string;
}

// Config types
export interface AppConfig {
  whisper_model: string;
  language: string;
  llm_provider: string;
  ollama_model: string;
  ollama_url: string;
  ollama_api_key?: string;
  openai_model: string;
  google_model: string;
  anthropic_model: string;
  output_dir: string;
  diarize: boolean;
}

// Processing steps
export type StepStatus = "pending" | "active" | "completed" | "error";

export interface ProcessingStep {
  id: number;
  title: string;
  status: StepStatus;
  description?: string;
}
