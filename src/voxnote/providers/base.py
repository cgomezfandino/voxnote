"""Base class for LLM providers."""

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def extract_insights(self, transcript: str) -> dict:
        """Extract structured insights from a meeting transcript.

        Args:
            transcript: The meeting transcription text.

        Returns:
            A dict with keys: resumen, decisiones, action_items, insights,
            preguntas_abiertas, proximos_pasos.
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name."""
        pass

    @property
    @abstractmethod
    def supports_streaming(self) -> bool:
        """Whether this provider supports streaming responses."""
        pass
