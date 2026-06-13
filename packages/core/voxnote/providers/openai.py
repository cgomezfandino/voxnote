"""OpenAI provider for insight extraction."""

import json
import os

from rich.console import Console

from voxnote.providers.base import LLMProvider, build_insights_prompt, truncate_transcript

console = Console()

SYSTEM_PROMPT = """\
Eres un asistente especializado en analizar transcripciones de reuniones. \
Extrae insights estructurados y responde ÚNICAMENTE con JSON válido, \
sin markdown ni backticks.
"""

MAX_TRANSCRIPT_CHARS = 8000  # OpenAI can handle more


class OpenAIProvider(LLMProvider):
    """OpenAI API provider (gpt-4, gpt-3.5-turbo, etc.)."""

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")

        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    @property
    def name(self) -> str:
        return f"OpenAI ({self.model})"

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using OpenAI API."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package not installed. Install with: pip install openai")

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        response = client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_insights_prompt(
                        truncate_transcript(transcript, MAX_TRANSCRIPT_CHARS)
                    ),
                },
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        data: dict = json.loads(raw)
        console.print("[green]Insights extracted[/]")
        return data
