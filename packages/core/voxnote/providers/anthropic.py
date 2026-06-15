"""Anthropic (Claude) provider for insight extraction."""

import json
import os
import re

from rich.console import Console

from voxnote.providers.base import LLMProvider, build_insights_prompt, truncate_transcript

console = Console()

SYSTEM_PROMPT = """\
Eres un asistente especializado en analizar transcripciones de reuniones. \
Extrae insights estructurados y responde ÚNICAMENTE con JSON válido, \
sin markdown ni backticks.
"""

MAX_TRANSCRIPT_CHARS = 8000


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider (claude-opus-4-8, sonnet, haiku, …)."""

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        self.model = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")
        # Optional override for proxies / gateways; None lets the SDK use its default.
        self.base_url = os.getenv("ANTHROPIC_BASE_URL") or None

    @property
    def name(self) -> str:
        return f"Anthropic ({self.model})"

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using the Anthropic Messages API."""
        try:
            import anthropic
        except ImportError:
            raise ImportError(
                "anthropic package not installed. Install with: pip install anthropic"
            )

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        client_kwargs: dict = {"api_key": self.api_key}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
        client = anthropic.Anthropic(**client_kwargs)

        # No temperature/thinking: Opus 4.8 rejects sampling params, and the system
        # prompt + "ONLY JSON" instruction keeps the output a single JSON object.
        response = client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": build_insights_prompt(
                        truncate_transcript(transcript, MAX_TRANSCRIPT_CHARS)
                    ),
                }
            ],
        )

        raw = "".join(b.text for b in response.content if getattr(b, "type", None) == "text")
        raw = re.sub(r"```json?\n?", "", raw).replace("```", "").strip()
        try:
            data: dict = json.loads(raw)
        except json.JSONDecodeError:
            # Be robust to any prose around the JSON object.
            start, end = raw.find("{"), raw.rfind("}")
            data = json.loads(raw[start : end + 1])

        console.print("[green]Insights extracted[/]")
        return data
