"""CLI entry point for Voxnote."""

from datetime import datetime
from pathlib import Path

import click
from rich.console import Console

from voxnote.config import settings

console = Console()


@click.group()
@click.version_option(package_name="voxnote")
def main() -> None:
    """Voxnote — record meetings, extract insights, stay organized."""


@main.command()
@click.option("-o", "--output", type=click.Path(), default=None, help="Output .wav path")
@click.option("-d", "--duration", type=float, default=None, help="Recording duration in seconds (omit for manual stop)")
def record(output: str | None, duration: float | None) -> None:
    """Record audio from the microphone."""
    from voxnote.pipeline.recorder import record_audio

    if output is None:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output = f"recordings/{ts}.wav"

    record_audio(output, duration=duration)


@main.command()
@click.argument("audio", type=click.Path(exists=True))
@click.option("-m", "--model", default=None, help=f"Whisper model (default: {settings.whisper_model})")
def transcribe(audio: str, model: str | None) -> None:
    """Transcribe an audio file with Whisper."""
    from voxnote.pipeline.transcriber import transcribe as do_transcribe

    text = do_transcribe(audio, model_name=model)
    console.print(text)


@main.command()
@click.argument("audio", type=click.Path(exists=True))
@click.option("-m", "--model", default=None, help="Whisper model override")
@click.option("-o", "--output-dir", type=click.Path(), default=None, help="Output directory for the note")
def process(audio: str, model: str | None, output_dir: str | None) -> None:
    """Run the full pipeline: transcribe → extract insights → export note."""
    from voxnote.pipeline.exporter import export_obsidian
    from voxnote.pipeline.insights import extract_insights
    from voxnote.pipeline.transcriber import transcribe as do_transcribe

    text = do_transcribe(audio, model_name=model)
    insights = extract_insights(text)
    out = Path(output_dir) if output_dir else None
    note = export_obsidian(insights, text, audio, output_dir=out)
    console.print(f"\n[bold green]Done![/] Open in Obsidian → {note}")
