"""Google Gemini provider for insight extraction."""

import json
import os

from rich.console import Console

from voxnote.providers.base import LLMProvider, build_insights_prompt

console = Console()

MAX_TRANSCRIPT_CHARS = 10000  # Gemini has large context


class GoogleProvider(LLMProvider):
    """Google Gemini API provider."""

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable not set")

        self.model = os.getenv("GOOGLE_MODEL", "gemini-2.0-flash")

    @property
    def name(self) -> str:
        return f"Google ({self.model})"

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using Google Gemini API."""
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            raise ImportError(
                "google-genai package not installed. Install with: pip install google-genai"
            )

        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        client = genai.Client(api_key=self.api_key)

        prompt = build_insights_prompt(transcript[:MAX_TRANSCRIPT_CHARS])

        response = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        raw = response.text
        data: dict = json.loads(raw)
        console.print("[green]Insights extracted[/]")
        return data
