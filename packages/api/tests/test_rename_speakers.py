"""Speaker-rename endpoint: maps SPEAKER_xx labels to real names in a note."""

from __future__ import annotations

from fastapi.testclient import TestClient
from voxnote.config import settings


def _write_note(name: str, content: str) -> None:
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    (settings.output_dir / name).write_text(content, encoding="utf-8")


def test_rename_speakers_replaces_labels(client: TestClient) -> None:
    _write_note(
        "rename-test.md",
        "## Participantes\n\n- **SPEAKER_00**\n\n[SPEAKER_00]: Hola.\n\n[SPEAKER_01]: Qué tal.\n",
    )
    res = client.post(
        "/api/notes/rename-test.md/speakers",
        json={"mapping": {"SPEAKER_00": "Carlos", "SPEAKER_01": "Ana"}},
    )
    assert res.status_code == 200
    content = res.json()["content"]
    assert "Carlos" in content
    assert "Ana" in content
    assert "SPEAKER_00" not in content
    assert "SPEAKER_01" not in content


def test_rename_speakers_ignores_bad_keys_and_sanitizes(client: TestClient) -> None:
    _write_note("rename-test2.md", "[SPEAKER_00]: Hola.\n")
    res = client.post(
        "/api/notes/rename-test2.md/speakers",
        json={"mapping": {"SPEAKER_00": "  Carlos\n\x07  ", "resumen": "HACK"}},
    )
    assert res.status_code == 200
    content = res.json()["content"]
    assert "[Carlos]" in content  # trimmed + control char removed
    assert "HACK" not in content  # non-speaker key ignored
