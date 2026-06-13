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

    slug = Path(audio_name).stem

    import re

    # Match format YYYY-MM-DD_HH-MM-SS
    match = re.match(r"^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})_(.*)$", slug)
    if match:
        date_str = match.group(1)
        time_str = f"{match.group(2)}:{match.group(3)}"
        title_slug = match.group(5)
        note_filename = f"{slug}.md"
    else:
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M")
        title_slug = slug
        note_filename = f"{date_str}_{slug}.md"

    def _as_list(value: object) -> list:
        # LLM output sometimes returns a bare string where a list is expected. Iterating
        # that string would emit one bullet per character, so coerce to a list first.
        if value is None or value == "":
            return []
        return value if isinstance(value, list) else [value]

    def _bullets(values: object, empty: str) -> str:
        items = [str(v).strip() for v in _as_list(values) if str(v).strip()]
        return "\n".join(f"- {v}" for v in items) if items else f"- {empty}"

    tasks = ""
    for item in _as_list(insights.get("action_items")):
        if not isinstance(item, dict) or not item.get("tarea"):
            continue
        resp = item.get("responsable", "TBD")
        dl = item.get("deadline", "TBD")
        tasks += f"- [ ] {item['tarea']} @{resp} (deadline: {dl})\n"

    participantes_rows = []
    for p in _as_list(insights.get("participantes")):
        if isinstance(p, dict) and p.get("hablante"):
            aporte = p.get("aporte", "")
            participantes_rows.append(f"- **{p['hablante']}**" + (f" — {aporte}" if aporte else ""))
        elif isinstance(p, str) and p.strip():
            participantes_rows.append(f"- **{p.strip()}**")

    comentarios_rows = []
    for c in _as_list(insights.get("comentarios_destacados")):
        if isinstance(c, dict) and c.get("cita"):
            speaker = c.get("hablante", "")
            prefix = f"**{speaker}:** " if speaker else ""
            comentarios_rows.append(f"> {prefix}{c['cita']}")
        elif isinstance(c, str) and c.strip():
            comentarios_rows.append(f"> {c.strip()}")

    decisions = _bullets(insights.get("decisiones", []), "Ninguna")
    insight_lines = _bullets(insights.get("insights", []), "Ninguno")
    questions = _bullets(insights.get("preguntas_abiertas", []), "Ninguna")
    next_steps = _bullets(insights.get("proximos_pasos", []), "Ninguno")
    tasks_md = tasks.rstrip() if tasks else "- [ ] Sin tareas identificadas"

    sections = [f"## 📝 Resumen\n\n{insights.get('resumen', 'N/A')}"]
    if participantes_rows:
        sections.append("## 👥 Participantes\n\n" + "\n".join(participantes_rows))
    if insights.get("puntos_clave"):
        sections.append("## 📌 Puntos clave\n\n" + _bullets(insights["puntos_clave"], ""))
    sections.append("## ✅ Decisiones tomadas\n\n" + decisions)
    sections.append("## 🎯 Tareas pendientes\n\n" + tasks_md)
    sections.append("## 💡 Insights clave\n\n" + insight_lines)
    if comentarios_rows:
        sections.append("## 💬 Comentarios destacados\n\n" + "\n".join(comentarios_rows))
    sections.append("## ❓ Preguntas abiertas\n\n" + questions)
    sections.append("## 🔜 Próximos pasos\n\n" + next_steps)
    body = "\n\n---\n\n".join(sections)

    note = f"""\
---
tags: [meeting, {date_str}]
date: {date_str}
time: {time_str}
audio: "[[audio/{Path(audio_name).name}]]"
---

# 📋 Reunión — {title_slug}

> 🗓️ **Fecha:** {date_str} · ⏰ **Hora:** {time_str} · 🎧 `{Path(audio_name).name}`

---

{body}

---

<details>
<summary>📄 Transcripción completa</summary>

{transcript_text}

</details>
"""

    note_path = output_dir / note_filename
    note_path.write_text(note, encoding="utf-8")
    try:
        note_path.chmod(0o600)  # notes can contain sensitive meeting content
    except OSError:
        pass
    console.print(f"[green]Note saved[/] → {note_path}")
    return note_path
