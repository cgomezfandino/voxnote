"""Audio transcription using OpenAI Whisper (local)."""

from pathlib import Path

import whisper
from rich.console import Console

from voxnote.config import settings

console = Console()


def transcribe(audio_path: str | Path, model_name: str | None = None) -> str:
    """Transcribe an audio file and return the full text.

    Args:
        audio_path: Path to the audio file (mp3, wav, m4a, etc.).
        model_name: Whisper model override. Defaults to settings.whisper_model.

    Returns:
        The transcribed text.
    """
    model_name = model_name or settings.whisper_model
    console.print(f"[bold blue]Transcribing[/] with Whisper ({model_name})…")

    model = whisper.load_model(model_name)
    language = settings.language if settings.language else None
    result = model.transcribe(str(audio_path), language=language)

    text: str = result["text"]
    console.print(f"[green]Transcription complete[/] — {len(text)} chars")
    return text
