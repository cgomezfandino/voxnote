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
  tarea: string;
  responsable: string;
  deadline: string;
}

export interface Participante {
  hablante: string;
  aporte?: string;
}

export interface Comentario {
  hablante?: string;
  cita: string;
}

export interface InsightsResult {
  resumen: string;
  participantes?: Participante[];
  puntos_clave?: string[];
  decisiones: string[];
  action_items: ActionItem[];
  insights: string[];
  comentarios_destacados?: Comentario[];
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
  ollama_api_key?: string;
  openai_model: string;
  google_model: string;
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
