"""Base class for LLM providers."""

from abc import ABC, abstractmethod

SPEAKER_CONTEXT_ES = (
    "NOTA: La transcripción incluye etiquetas de hablante (ej: [SPEAKER_00], "
    "[SPEAKER_01]). Usa estas etiquetas para atribuir decisiones, action items "
    "e insights a los hablantes correspondientes. En el campo 'responsable' de "
    "action_items, usa la etiqueta del hablante si no se menciona un nombre.\n\n"
)

SPEAKER_CONTEXT_ZH = (
    "注意：转录包含说话人标签（如 [SPEAKER_00]、[SPEAKER_01]）。"
    "请使用这些标签将决策、待办事项和见解归属到相应的说话人。"
    "在 action_items 的 'responsable' 字段中，如果没有提到姓名，请使用说话人标签。\n\n"
)


def build_transcript_section(transcript: str, lang: str = "es") -> str:
    """Build the transcript section of the prompt, adding speaker context if needed."""
    has_speakers = "[SPEAKER_" in transcript
    if has_speakers:
        context = SPEAKER_CONTEXT_ZH if lang == "zh" else SPEAKER_CONTEXT_ES
    else:
        context = ""
    return f"{context}{transcript}"


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


