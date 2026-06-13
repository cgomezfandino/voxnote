"""Tests for the Markdown → Word (.docx) exporter."""

from __future__ import annotations

from io import BytesIO

from docx import Document
from voxnote.pipeline.docx_exporter import markdown_to_docx

SAMPLE = """\
---
tags: [meeting, 2026-06-13]
date: 2026-06-13
time: 10:30
audio: "[[audio/2026-06-13_10-30-00_reunion.wav]]"
---

# 📋 Reunión — reunion

> 🗓️ **Fecha:** 2026-06-13 · ⏰ **Hora:** 10:30 · 🎧 `reunion.wav`

---

## 📝 Resumen

Discutimos el lanzamiento del producto.

---

## ✅ Decisiones tomadas

- Lanzar el 1 de julio
- Contratar a un diseñador

---

## 🎯 Tareas pendientes

- [ ] Preparar la demo @SPEAKER_00 (deadline: 2026-06-20)
- [ ] Revisar el presupuesto @Ana (deadline: TBD)

---

## 🔜 Próximos pasos

1. Enviar acta
2. Agendar seguimiento

---

<details>
<summary>📄 Transcripción completa</summary>

[SPEAKER_00]: Hola a todos.

[SPEAKER_01]: Empecemos.

</details>
"""


def _docx_text(data: bytes) -> str:
    document = Document(BytesIO(data))
    parts = [p.text for p in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            parts.extend(cell.text for cell in row.cells)
    return "\n".join(parts)


def test_markdown_to_docx_returns_valid_docx() -> None:
    data = markdown_to_docx(SAMPLE)
    assert isinstance(data, bytes)
    assert data[:2] == b"PK"  # a .docx is a ZIP archive
    Document(BytesIO(data))  # re-open to confirm it is structurally valid


def test_markdown_to_docx_includes_key_sections() -> None:
    text = _docx_text(markdown_to_docx(SAMPLE))
    assert "Resumen" in text
    assert "Discutimos el lanzamiento del producto." in text
    assert "Lanzar el 1 de julio" in text
    # Emoji are stripped from headings for a clean professional look.
    assert "📝" not in text
    assert "📋" not in text


def test_markdown_to_docx_builds_task_table() -> None:
    document = Document(BytesIO(markdown_to_docx(SAMPLE)))
    assert document.tables, "expected a task table"
    header = [c.text for c in document.tables[0].rows[0].cells]
    assert header == ["Tarea", "Responsable", "Fecha límite"]
    body_text = "\n".join(cell.text for row in document.tables[0].rows for cell in row.cells)
    assert "Preparar la demo" in body_text
    assert "SPEAKER_00" in body_text
    assert "2026-06-20" in body_text


def test_markdown_to_docx_sanitizes_invalid_xml_chars() -> None:
    # Control characters (e.g. from a malicious transcript) must not corrupt the docx.
    malicious = "## Resumen\n\nTexto con \x00\x07 caracteres de control."
    text = _docx_text(markdown_to_docx(malicious))
    assert "\x00" not in text and "\x07" not in text
    assert "caracteres de control" in text


def test_markdown_to_docx_includes_enriched_sections() -> None:
    # The Word export must carry the speaker-aware enriched sections too.
    md = (
        "# Reunión\n\n"
        "## 👥 Participantes\n\n"
        "- **SPEAKER_00** — Lideró la discusión.\n"
        "- **Ana** — Propuso usar JWT.\n\n"
        "## 📌 Puntos clave\n\n- Estado del MVP\n\n"
        "## 💬 Comentarios destacados\n\n"
        "> **Ana:** JWT escala mejor que sessions.\n"
    )
    text = _docx_text(markdown_to_docx(md))
    assert "Participantes" in text
    assert "SPEAKER_00" in text
    assert "Ana" in text
    assert "Puntos clave" in text
    assert "JWT escala mejor que sessions." in text
