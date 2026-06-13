"""Tests for the export endpoints."""

from __future__ import annotations

from io import BytesIO

from docx import Document
from fastapi.testclient import TestClient

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

MARKDOWN = "# Reunión\n\n## Resumen\n\nUna nota de prueba.\n"


def test_export_docx_returns_word_document(client: TestClient) -> None:
    res = client.post(
        "/api/export/docx",
        json={"content": MARKDOWN, "filename": "2026-06-13_reunion.md"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == DOCX_MEDIA_TYPE
    assert res.headers["content-disposition"] == 'attachment; filename="2026-06-13_reunion.docx"'
    assert res.content[:2] == b"PK"

    document = Document(BytesIO(res.content))
    text = "\n".join(p.text for p in document.paragraphs)
    assert "Una nota de prueba." in text


def test_export_docx_sanitizes_download_filename(client: TestClient) -> None:
    res = client.post(
        "/api/export/docx",
        json={"content": MARKDOWN, "filename": "../../etc/passwd"},
    )
    assert res.status_code == 200
    download_name = res.headers["content-disposition"].split("filename=", 1)[1]
    assert "/" not in download_name


def test_oversized_json_body_returns_413(client: TestClient, monkeypatch) -> None:
    """The body-size middleware rejects JSON bodies above the configured cap."""
    from voxnote.config import settings

    monkeypatch.setattr(settings, "max_json_mb", 0)  # any JSON body now exceeds the cap
    res = client.post("/api/export/docx", json={"content": "x", "filename": "a.md"})
    assert res.status_code == 413
