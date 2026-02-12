export interface TranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
}

export interface InsightsResult {
  resumen: string;
  decisiones: string[];
  action_items: string[];
  insights: string[];
  preguntas_abiertas: string[];
  proximos_pasos: string[];
}

export type StepStatus = "pending" | "active" | "completed";

export interface ProcessingStep {
  id: number;
  title: string;
  status: StepStatus;
  description?: string;
}
