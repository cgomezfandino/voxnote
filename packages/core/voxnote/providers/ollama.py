"""Ollama provider for local LLM inference."""

import json
import random
import re
import time

import requests
from rich.console import Console

from voxnote.config import settings
from voxnote.providers._observability import observe_llm_call
from voxnote.providers.base import LLMProvider, build_insights_prompt, truncate_transcript

console = Console()

MAX_TRANSCRIPT_CHARS = 4000

# HTTP statuses worth retrying for a local/cloud LLM endpoint.
_RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}


class OllamaProvider(LLMProvider):
    """Ollama local LLM provider."""

    @property
    def name(self) -> str:
        return f"Ollama ({settings.ollama_model})"

    def extract_insights(self, transcript: str) -> dict:
        """Extract insights using Ollama."""
        console.print(f"[bold blue]Extracting insights[/] with {self.name}…")

        prompt = build_insights_prompt(truncate_transcript(transcript, MAX_TRANSCRIPT_CHARS))

        headers = {}
        if settings.ollama_api_key:
            headers["Authorization"] = f"Bearer {settings.ollama_api_key}"

        url = f"{settings.ollama_url.rstrip('/')}/api/generate"
        payload = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
            # Constrain decoding to valid JSON. Without this, small local models
            # (e.g. ~3-4B) return prose/markdown that fails to parse; with it Ollama
            # forces a well-formed JSON object.
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_predict": 3000,  # richer structure needs more tokens
            },
        }

        with observe_llm_call(provider="ollama", model=settings.ollama_model) as obs:
            body = self._post_with_retry(url, headers, payload)
            obs["tokens"] = {
                "prompt": body.get("prompt_eval_count"),
                "completion": body.get("eval_count"),
                "total": (
                    (body.get("prompt_eval_count") or 0) + (body.get("eval_count") or 0)
                    or None
                ),
            }

        raw: str = body["response"]
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
                # Do NOT dump the raw response: it is the LLM's insights JSON derived
                # directly from the meeting transcript, and stdout is tee'd to the dev
                # log on disk. Log only the length and the parse error.
                console.print(f"[red]JSON parse error:[/] {e2}")
                console.print(f"[yellow]Unparseable response:[/] {len(raw)} chars")
                raise ValueError(f"Failed to parse JSON from Ollama: {e2}") from e2

        console.print("[green]Insights extracted[/]")
        return data

    @staticmethod
    def _post_with_retry(url: str, headers: dict, payload: dict) -> dict:
        """POST to Ollama with bounded retries on transient errors.

        ``requests`` has no built-in backoff, so we wrap it: retry on connection
        errors, timeouts, and the usual retryable HTTP statuses (429/5xx), with
        exponential backoff + jitter. Non-retryable HTTP errors raise immediately
        via ``raise_for_status``.
        """
        max_retries = max(0, settings.llm_max_retries)
        last_exc: Exception | None = None
        for attempt in range(max_retries + 1):
            try:
                resp = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=settings.ollama_timeout,
                )
                if resp.status_code in _RETRYABLE_STATUS and attempt < max_retries:
                    OllamaProvider._backoff_sleep(attempt)
                    continue
                resp.raise_for_status()
                return resp.json()
            except (requests.ConnectionError, requests.Timeout) as exc:
                last_exc = exc
                if attempt < max_retries:
                    OllamaProvider._backoff_sleep(attempt)
                    continue
                raise
        # Exhausted retries on a retryable status code.
        if last_exc is not None:  # pragma: no cover - defensive
            raise last_exc
        raise requests.RequestException("Ollama request failed after retries")

    @staticmethod
    def _backoff_sleep(attempt: int) -> None:
        """Exponential backoff with full jitter: 0.5 * 2^n seconds, capped, ±jitter."""
        base = min(0.5 * (2**attempt), 8.0)
        time.sleep(base + random.uniform(0, 0.25))

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
