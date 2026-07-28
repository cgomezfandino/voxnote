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
        if not isinstance(item, dict) or not item.get("task"):
            continue
        resp = item.get("owner", "TBD")
        dl = item.get("deadline", "TBD")
        tasks += f"- [ ] {item['task']} @{resp} (deadline: {dl})\n"

    participants_rows = []
    for p in _as_list(insights.get("participants")):
        if isinstance(p, dict) and p.get("speaker"):
            contribution = p.get("contribution", "")
            participants_rows.append(
                f"- **{p['speaker']}**" + (f" — {contribution}" if contribution else "")
            )
        elif isinstance(p, str) and p.strip():
            participants_rows.append(f"- **{p.strip()}**")

    highlights_rows = []
    for c in _as_list(insights.get("highlights")):
        if isinstance(c, dict) and c.get("quote"):
            speaker = c.get("speaker", "")
            prefix = f"**{speaker}:** " if speaker else ""
            highlights_rows.append(f"> {prefix}{c['quote']}")
        elif isinstance(c, str) and c.strip():
            highlights_rows.append(f"> {c.strip()}")

    decisions = _bullets(insights.get("decisions", []), "None")
    insight_lines = _bullets(insights.get("insights", []), "None")
    questions = _bullets(insights.get("open_questions", []), "None")
    next_steps = _bullets(insights.get("next_steps", []), "None")
    tasks_md = tasks.rstrip() if tasks else "- [ ] No tasks identified"

    sections = [f"## 📝 Summary\n\n{insights.get('summary', 'N/A')}"]
    if participants_rows:
        sections.append("## 👥 Participants\n\n" + "\n".join(participants_rows))
    if insights.get("key_points"):
        sections.append("## 📌 Key points\n\n" + _bullets(insights["key_points"], ""))
    sections.append("## ✅ Decisions\n\n" + decisions)
    sections.append("## 🎯 Action items\n\n" + tasks_md)
    sections.append("## 💡 Insights\n\n" + insight_lines)
    if highlights_rows:
        sections.append("## 💬 Highlights\n\n" + "\n".join(highlights_rows))
    sections.append("## ❓ Open questions\n\n" + questions)
    sections.append("## 🔜 Next steps\n\n" + next_steps)
    body = "\n\n---\n\n".join(sections)

    note = f"""\
---
tags: [meeting, {date_str}]
date: {date_str}
time: {time_str}
audio: "[[audio/{Path(audio_name).name}]]"
---

# 📋 Meeting — {title_slug}

> 🗓️ **Date:** {date_str} · ⏰ **Time:** {time_str} · 🎧 `{Path(audio_name).name}`

---

{body}

---

<details>
<summary>📄 Full transcript</summary>

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
