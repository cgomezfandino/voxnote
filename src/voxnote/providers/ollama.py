"""Ollama provider for local LLM inference."""

import json
import re

import requests
from rich.console import Console

from voxnote.config import settings
from voxnote.providers.base import LLMProvider

console = Console()

PROMPT_TEMPLATE = """\
Analiza esta transcripción de reunión y responde SOLO con un JSON válido \
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

MAX_TRANSCRIPT_CHARS = 4000


class OllamaProvider(LLMProvider):
    """Ollama local LLM provider."""

    @property
    def name(self) -> str:
        return f"Ollama ({settings.ollama_model})"

    @property
    def supports_streaming(self) -> bool:
        return True

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using Ollama."""
        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        prompt = PROMPT_TEMPLATE.format(transcript=transcript[:MAX_TRANSCRIPT_CHARS])

        resp = requests.post(
            f"{settings.ollama_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1},
            },
            timeout=settings.ollama_timeout,
        )
        resp.raise_for_status()

        raw: str = resp.json()["response"]
        raw = self._clean_json(raw)

        data: dict = json.loads(raw)
        console.print("[green]Insights extracted[/]")
        return data

    @staticmethod
    def _clean_json(raw: str) -> str:
        """Strip markdown fences from JSON response."""
        raw = re.sub(r"```json?\n?", "", raw)
        raw = raw.replace("```", "").strip()
        return raw
