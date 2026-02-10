"""Insight extraction from meeting transcripts using configurable LLM providers."""

from voxnote.config import settings
from voxnote.providers import get_provider


def extract_insights(transcript: str, provider_name: str | None = None) -> dict:
    """Extract structured insights from a meeting transcript.

    Args:
        transcript: The meeting transcription text.
        provider_name: Override the provider (ollama|openai|kimi|glm|google).
                      If None, uses settings.llm_provider.

    Returns:
        A dict with keys: resumen, decisiones, action_items, insights,
        preguntas_abiertas, proximos_pasos.
    """
    provider = get_provider(provider_name or settings.llm_provider)
    return provider.extract_insights(transcript)
