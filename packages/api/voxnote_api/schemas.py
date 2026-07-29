"""Pydantic schemas for API request/response models."""

from __future__ import annotations

import re
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator

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
    audio_filename: str | None = None


# --- Insights ---


class ActionItem(BaseModel):
    """A single action item extracted from the meeting."""

    task: str
    owner: str = "TBD"
    deadline: str = "TBD"


class Participant(BaseModel):
    """A meeting participant / speaker and what they contributed."""

    speaker: str
    contribution: str = ""


class Highlight(BaseModel):
    """A notable quote / highlight, attributed to a speaker when possible."""

    speaker: str = ""
    quote: str


class InsightsRequest(BaseModel):
    """Request body for insights extraction."""

    text: str
    provider: str = "ollama"


def _to_list(value: object) -> list:
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _flatten(item: object) -> str:
    if item is None:
        return ""
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return " — ".join(str(v) for v in item.values() if v)
    return str(item)


# Spanish→English key aliases. The prompt now emits English keys, but LLMs are not
# deterministic and older persisted flows may still return Spanish keys, so we accept
# both at the normalization boundary and never let a legacy key drop a payload.
_KEY_ALIASES = {
    "resumen": "summary",
    "participantes": "participants",
    "puntos_clave": "key_points",
    "decisiones": "decisions",
    "comentarios_destacados": "highlights",
    "preguntas_abiertas": "open_questions",
    "proximos_pasos": "next_steps",
}
# Per-object Spanish sub-keys → English sub-keys.
_SUBKEY_ALIASES = {
    "tarea": "task",
    "responsable": "owner",
    "hablante": "speaker",
    "aporte": "contribution",
    "cita": "quote",
}


class InsightsResponse(BaseModel):
    """Structured, professional insights extracted from a meeting transcript.

    The string/object lists are normalized defensively because LLM output (especially
    local models) is not always perfectly shaped — a malformed field never breaks the
    endpoint, it just degrades to a best-effort value.
    """

    summary: str = "N/A"
    participants: list[Participant] = Field(default_factory=list)
    key_points: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)
    highlights: list[Highlight] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data
        out = dict(data)
        # 1) Accept legacy Spanish top-level keys as aliases of the English ones.
        for es, en in _KEY_ALIASES.items():
            if es in out and en not in out:
                out[en] = out.pop(es)
        # 2) Accept legacy Spanish sub-keys inside object lists.
        for key in ("action_items", "participants", "highlights"):
            items = out.get(key)
            if isinstance(items, list):
                mapped = []
                for item in items:
                    if isinstance(item, dict):
                        mapped.append(
                            {_SUBKEY_ALIASES.get(k, k): v for k, v in item.items()}
                        )
                    else:
                        mapped.append(item)
                out[key] = mapped

        str_keys = (
            "key_points",
            "decisions",
            "insights",
            "open_questions",
            "next_steps",
        )
        for key in str_keys:
            if key in out:
                # Drop blanks so a None/"" never becomes the literal "None" in the UI.
                out[key] = [s for i in _to_list(out[key]) if (s := _flatten(i).strip())]
        obj_keys = (
            ("action_items", "task"),
            ("participants", "speaker"),
            ("highlights", "quote"),
        )
        for key, primary in obj_keys:
            if key in out:
                coerced: list = []
                for item in _to_list(out[key]):
                    if isinstance(item, dict):
                        # The sub-models require `primary` (task/speaker/quote) with no
                        # default, so a dict missing it would raise ValidationError and lose
                        # the whole payload. Guarantee it best-effort: synthesize from the
                        # other values, or drop the item if there is nothing usable.
                        d = dict(item)
                        if not str(d.get(primary, "")).strip():
                            synthesized = _flatten(
                                {k: v for k, v in d.items() if k != primary}
                            ).strip()
                            if not synthesized:
                                continue
                            d[primary] = synthesized
                        coerced.append(d)
                    elif isinstance(item, str) and item.strip():
                        coerced.append({primary: item})
                out[key] = coerced
        return out


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


class DocxExportRequest(BaseModel):
    """Request body for Word (.docx) export from a note's Markdown."""

    content: str
    filename: str | None = None


# --- Config ---


class ConfigResponse(BaseModel):
    """Current application configuration."""

    whisper_model: str
    language: str
    llm_provider: str
    ollama_model: str
    ollama_url: str
    ollama_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    google_model: str = "gemini-2.0-flash"
    anthropic_model: str = "claude-opus-4-8"
    diarize: bool
    hf_token: str = ""
    output_dir: str
    available_providers: list[str]


_ALLOWED_WHISPER_MODELS = {"tiny", "base", "small", "medium", "large-v3", "turbo"}
_ALLOWED_PROVIDERS = {"ollama", "ollama-cloud", "openai", "google", "anthropic"}


class ConfigUpdateRequest(BaseModel):
    """Partial configuration update."""

    whisper_model: str | None = None
    language: str | None = None
    llm_provider: str | None = None
    ollama_model: str | None = None
    ollama_url: str | None = None
    ollama_api_key: str | None = None
    openai_model: str | None = None
    google_model: str | None = None
    anthropic_model: str | None = None
    diarize: bool | None = None

    @field_validator("whisper_model")
    @classmethod
    def _check_whisper_model(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALLOWED_WHISPER_MODELS:
            raise ValueError(f"whisper_model must be one of {sorted(_ALLOWED_WHISPER_MODELS)}")
        return v

    @field_validator("llm_provider")
    @classmethod
    def _check_provider(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALLOWED_PROVIDERS:
            raise ValueError(f"llm_provider must be one of {sorted(_ALLOWED_PROVIDERS)}")
        return v

    @field_validator("language")
    @classmethod
    def _check_language(cls, v: str | None) -> str | None:
        if v is not None and v != "" and not re.fullmatch(r"[A-Za-z]{2}", v):
            raise ValueError("language must be a 2-letter ISO 639-1 code or empty")
        return v

    @field_validator("ollama_url")
    @classmethod
    def _check_ollama_url(cls, v: str | None) -> str | None:
        """Validate ``ollama_url`` to prevent SSRF via ``PUT /api/config``.

        ``ollama_url`` is operator-settable, and the Ollama provider POSTs the full
        meeting-transcript prompt plus a ``Bearer`` key to it. Without validation an
        attacker who can reach ``PUT /api/config`` (in dev the token check is a no-op)
        could repoint the LLM endpoint and exfiltrate transcripts + the API key. We
        therefore require an ``http(s)`` scheme and reject the cloud metadata-sink hosts
        that are never a legitimate Ollama backend. Local/private hosts are allowed.
        """
        if v is None:
            return v
        url = v.strip()
        if not url:
            return v
        try:
            parsed = urlparse(url)
        except ValueError as exc:  # pragma: no cover - urlparse rarely raises
            raise ValueError(f"invalid ollama_url: {exc}") from exc
        scheme = (parsed.scheme or "").lower()
        if scheme not in {"http", "https"}:
            raise ValueError(
                "ollama_url must use an http or https scheme "
                f"(got '{scheme or 'empty'}')"
            )
        host = (parsed.hostname or "").lower().rstrip(".")
        if host in _SSRF_BLOCKED_HOSTS:
            raise ValueError("ollama_url must not point at a cloud metadata endpoint")
        return url


# Cloud instance metadata-sink hosts. These expose credentials to anything that can
# reach them and are never a legitimate Ollama backend, so any request to them is a
# clear SSRF signal. Bare "0.0.0.0" is also blocked (not a real target for Ollama).
_SSRF_BLOCKED_HOSTS = frozenset(
    {
        "169.254.169.254",          # AWS / Azure / GCP / OpenStack IPv4 metadata
        "0.0.0.0",                  # non-routable; only used to elide host checks
        "metadata.google.internal",  # GCP metadata
        "metadata",                 # GCP metadata (short form)
        "fd00:ec2::254",            # AWS IMDSv6 metadata
        "metadata.azure.com",       # Azure metadata
    }
)


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


class RenameSpeakersRequest(BaseModel):
    """Map diarization labels (SPEAKER_00) to real names, applied to a note."""

    mapping: dict[str, str]
