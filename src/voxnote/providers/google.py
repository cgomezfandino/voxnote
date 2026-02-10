"""Google Gemini provider for insight extraction."""

import json
import os

from rich.console import Console

from voxnote.providers.base import LLMProvider

console = Console()

PROMPT_TEMPLATE = """\
Analiza esta transcripción de reunión y responde ÚNICAMENTE con un JSON válido \
(sin markdown, sin backticks) con esta estructura exacta:

{{
  "resumen": "resumen ejecutivo en 3-5 oraciones",
  "decisiones": ["lista de decisiones tomadas"],
  "action_items": [
    {{"tarea": "descripción", "responsable": "nombre o TBD", "deadline": "fecha o TBD"}}
  ],
  "insights": ["observaciones clave o puntos importantes"],
  "preguntas_abiertas": ["preguntas sin resolver"],
  "proximos_pasos": ["siguientes pasos acordados"]
}}

TRANSCRIPCIÓN:
{transcript}
"""

MAX_TRANSCRIPT_CHARS = 10000  # Gemini has large context


class GoogleProvider(LLMProvider):
    """Google Gemini API provider."""

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable not set")

        self.model = os.getenv("GOOGLE_MODEL", "gemini-2.0-flash-exp")

    @property
    def name(self) -> str:
        return f"Google ({self.model})"

    @property
    def supports_streaming(self) -> bool:
        return True

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using Google Gemini API."""
        try:
            import google.generativeai as genai
        except ImportError:
            raise ImportError(
                "google-generativeai package not installed. "
                "Install with: pip install google-generativeai"
            )

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(
            self.model,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        prompt = PROMPT_TEMPLATE.format(transcript=transcript[:MAX_TRANSCRIPT_CHARS])
        response = model.generate_content(prompt)

        raw = response.text
        data: dict = json.loads(raw)
        console.print("[green]Insights extracted[/]")
        return data
