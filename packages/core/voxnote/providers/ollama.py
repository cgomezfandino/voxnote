"""Ollama provider for local LLM inference."""

import json
import re

import requests
from rich.console import Console

from voxnote.config import settings
from voxnote.providers.base import LLMProvider, build_transcript_section

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
{transcript_section}
"""

MAX_TRANSCRIPT_CHARS = 4000


class OllamaProvider(LLMProvider):
    """Ollama local LLM provider."""

    @property
    def name(self) -> str:
        return f"Ollama ({settings.ollama_model})"



    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using Ollama."""
        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        section = build_transcript_section(transcript[:MAX_TRANSCRIPT_CHARS])
        prompt = PROMPT_TEMPLATE.format(transcript_section=section)

        headers = {}
        if settings.ollama_api_key:
            headers["Authorization"] = f"Bearer {settings.ollama_api_key}"

        resp = requests.post(
            f"{settings.ollama_url.rstrip('/')}/api/generate",
            headers=headers,
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 2000,  # Allow longer responses
                },
            },
            timeout=settings.ollama_timeout,
        )
        resp.raise_for_status()

        raw: str = resp.json()["response"]
        raw = self._clean_json(raw)

        try:
            data: dict = json.loads(raw)
        except json.JSONDecodeError:
            # Try repairing truncated JSON (common with local models)
            repaired = self._repair_json(raw)
            try:
                data = json.loads(repaired)
                console.print("[yellow]JSON repaired (response was truncated)[/]")
            except json.JSONDecodeError as e2:
                console.print(f"[red]JSON parse error:[/] {e2}")
                console.print(f"[yellow]Raw response:[/]\n{raw[:500]}")
                raise ValueError(f"Failed to parse JSON from Ollama: {e2}") from e2

        console.print("[green]Insights extracted[/]")
        return data

    @staticmethod
    def _clean_json(raw: str) -> str:
        """Strip markdown fences and fix formatting issues."""
        raw = re.sub(r"```json?\n?", "", raw)
        raw = raw.replace("```", "").strip()

        def remove_inner_newlines(match):
            return match.group(0).replace("\n", " ")

        raw = re.sub(r'"[^"]*"', remove_inner_newlines, raw)
        return raw

    @staticmethod
    def _repair_json(raw: str) -> str:
        """Attempt to close truncated JSON from LLM responses."""
        # Count unmatched brackets
        opens = {"[": 0, "{": 0}
        closes = {"]": "[", "}": "{"}
        in_string = False
        escape = False
        for ch in raw:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch in opens:
                opens[ch] += 1
            elif ch in closes:
                opens[closes[ch]] -= 1

        # Close any unclosed brackets in reverse order
        suffix = "]" * max(0, opens["["]) + "}" * max(0, opens["{"])
        return raw.rstrip().rstrip(",") + suffix
