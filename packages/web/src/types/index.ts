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
}

// Insights types
export interface ActionItem {
  tarea: string;
  responsable: string;
  deadline: string;
}

export interface InsightsResult {
  resumen: string;
  decisiones: string[];
  action_items: ActionItem[];
  insights: string[];
  preguntas_abiertas: string[];
  proximos_pasos: string[];
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
  openai_model: string;
  kimi_model: string;
  glm_model: string;
  google_model: string;
  output_dir: string;
  diarize: boolean;
  hf_token: string;
}

// Processing steps
export type StepStatus = "pending" | "active" | "completed" | "error";

export interface ProcessingStep {
  id: number;
  title: string;
  status: StepStatus;
  description?: string;
}
