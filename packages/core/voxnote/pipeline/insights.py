"""Insight extraction from meeting transcripts using configurable LLM providers."""

from voxnote.config import settings
from voxnote.providers import get_provider


def extract_insights(transcript: str, provider_name: str | None = None) -> dict:
    """Extract structured insights from a meeting transcript.

    Args:
        transcript: The meeting transcription text.
        provider_name: Override the provider (ollama|openai|google).
                      If None, uses settings.llm_provider.

    Returns:
        A dict with keys: resumen, participantes, puntos_clave, decisiones,
        action_items, insights, comentarios_destacados, preguntas_abiertas,
        proximos_pasos.

    Note:
        Providers cap the transcript to their input budget; for very long meetings
        the transcript is truncated (with a visible warning) — see
        ``truncate_transcript`` in ``providers/base``. Full-coverage chunking is
        roadmapped for Fase 1.
    """
    provider = get_provider(provider_name or settings.llm_provider)
    return provider.extract_insights(transcript)
