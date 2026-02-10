"""Insight extraction from meeting transcripts using Ollama (local LLM)."""

import json
import re

import requests
from rich.console import Console

from voxnote.config import settings

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


def extract_insights(transcript: str) -> dict:
    """Send transcript to Ollama and return structured insights.

    Args:
        transcript: The meeting transcription text.

    Returns:
        A dict with keys: resumen, decisiones, action_items, insights,
        preguntas_abiertas, proximos_pasos.
    """
    console.print(f"[bold blue]Extracting insights[/] with {settings.ollama_model}…")

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
    # Strip possible markdown fences
    raw = re.sub(r"```json?\n?", "", raw)
    raw = raw.replace("```", "").strip()

    data: dict = json.loads(raw)
    console.print("[green]Insights extracted[/]")
    return data
