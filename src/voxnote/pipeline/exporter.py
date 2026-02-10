"""Export meeting insights as Obsidian-compatible Markdown."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from rich.console import Console

from voxnote.config import settings
from voxnote.pipeline.models import TranscriptResult

console = Console()


def export_obsidian(
    insights: dict,
    transcript: str | TranscriptResult,
    audio_name: str,
    output_dir: Path | None = None,
) -> Path:
    """Generate an Obsidian Markdown note from meeting insights.

    Args:
        insights: Structured dict returned by :func:`extract_insights`.
        transcript: Full transcription text or TranscriptResult with speaker info.
        audio_name: Original audio filename (used in the note title).
        output_dir: Override for settings.output_dir.

    Returns:
        Path to the written Markdown file.
    """
    # Normalize transcript to string
    if isinstance(transcript, TranscriptResult):
        transcript_text = transcript.to_speaker_text()
    else:
        transcript_text = transcript

    output_dir = output_dir or settings.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    slug = Path(audio_name).stem

    tasks = ""
    for item in insights.get("action_items", []):
        resp = item.get("responsable", "TBD")
        dl = item.get("deadline", "TBD")
        tasks += f"- [ ] {item['tarea']} @{resp} (deadline: {dl})\n"

    decisions = "\n".join(f"- {d}" for d in insights.get("decisiones", ["Ninguna"]))
    insight_lines = "\n".join(f"- {i}" for i in insights.get("insights", ["Ninguno"]))
    questions = "\n".join(f"- {q}" for q in insights.get("preguntas_abiertas", ["Ninguna"]))
    next_steps = "\n".join(f"- {p}" for p in insights.get("proximos_pasos", ["Ninguno"]))

    note = f"""\
---
tags: [meeting, {date_str}]
date: {date_str}
time: {time_str}
audio: "[[audio/{Path(audio_name).name}]]"
---

# Reunión {date_str} — {slug}

## Resumen

{insights.get("resumen", "N/A")}

## Decisiones

{decisions}

## Action Items

{tasks if tasks else "- [ ] Sin action items identificados"}

## Insights Clave

{insight_lines}

## Preguntas Abiertas

{questions}

## Próximos Pasos

{next_steps}

---

## Transcripción Completa

{transcript_text}
"""

    note_path = output_dir / f"{date_str}_{slug}.md"
    note_path.write_text(note, encoding="utf-8")
    console.print(f"[green]Note saved[/] → {note_path}")
    return note_path
