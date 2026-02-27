"""Pydantic schemas for API request/response models."""

from __future__ import annotations

from pydantic import BaseModel, Field


# --- Transcription ---


class SegmentResponse(BaseModel):
    """A single transcription segment with optional speaker label."""

    text: str
    start: float
    end: float
    speaker: str | None = None


class TranscriptionResponse(BaseModel):
    """Full transcription result with optional speaker diarization."""

    text: str
    segments: list[SegmentResponse] = Field(default_factory=list)
    has_speakers: bool = False


# --- Insights ---


class ActionItem(BaseModel):
    """A single action item extracted from the meeting."""

    tarea: str
    responsable: str = "TBD"
    deadline: str = "TBD"


class InsightsRequest(BaseModel):
    """Request body for insights extraction."""

    text: str
    provider: str = "ollama"


class InsightsResponse(BaseModel):
    """Structured insights extracted from a meeting transcript."""

    resumen: str = "N/A"
    decisiones: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)
    preguntas_abiertas: list[str] = Field(default_factory=list)
    proximos_pasos: list[str] = Field(default_factory=list)


# --- Export ---


class ExportRequest(BaseModel):
    """Request body for Obsidian note export."""

    insights: dict
    transcript_text: str
    audio_name: str
    has_speakers: bool = False


class ExportResponse(BaseModel):
    """Result of Obsidian note export."""

    filename: str
    content: str
    path: str


# --- Config ---


class ConfigResponse(BaseModel):
    """Current application configuration."""

    whisper_model: str
    language: str
    llm_provider: str
    ollama_model: str
    ollama_url: str
    openai_model: str = "gpt-4o-mini"
    kimi_model: str = "moonshot-v1-8k"
    glm_model: str = "glm-4"
    google_model: str = "gemini-2.0-flash-exp"
    diarize: bool
    hf_token: str = ""
    output_dir: str
    available_providers: list[str]


class ConfigUpdateRequest(BaseModel):
    """Partial configuration update."""

    whisper_model: str | None = None
    language: str | None = None
    llm_provider: str | None = None
    ollama_model: str | None = None
    openai_model: str | None = None
    kimi_model: str | None = None
    glm_model: str | None = None
    google_model: str | None = None
    diarize: bool | None = None


# --- Notes ---


class NoteListItem(BaseModel):
    """Summary of a generated note for listing."""

    filename: str
    created_at: str
    preview: str
    size_bytes: int = 0


class NoteDetailResponse(BaseModel):
    """Full content of a generated note."""

    filename: str
    content: str
    created_at: str
