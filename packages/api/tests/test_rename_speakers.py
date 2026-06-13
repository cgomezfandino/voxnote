"""Speaker-rename endpoint: maps SPEAKER_xx labels to real names in a note.

All tests run against a patched ``_get_output_dir`` pointing at ``tmp_path`` so they
never touch the user's real ``output_dir``.
"""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

PATCH_TARGET = "voxnote_api.routes.notes._get_output_dir"


def test_rename_speakers_replaces_labels(client: TestClient, tmp_path) -> None:
    note = tmp_path / "rename-test.md"
    note.write_text(
        "## Participantes\n\n- **SPEAKER_00**\n\n[SPEAKER_00]: Hola.\n\n[SPEAKER_01]: Qué tal.\n",
        encoding="utf-8",
    )
    with patch(PATCH_TARGET, return_value=tmp_path):
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
    # Change is persisted to disk, not just returned.
    assert "Carlos" in note.read_text(encoding="utf-8")


def test_rename_speakers_ignores_bad_keys_and_sanitizes(client: TestClient, tmp_path) -> None:
    note = tmp_path / "rename-test2.md"
    note.write_text("[SPEAKER_00]: Hola.\n", encoding="utf-8")
    with patch(PATCH_TARGET, return_value=tmp_path):
        res = client.post(
            "/api/notes/rename-test2.md/speakers",
            json={"mapping": {"SPEAKER_00": "  Carlos\n\x07  ", "resumen": "HACK"}},
        )
    assert res.status_code == 200
    content = res.json()["content"]
    assert "[Carlos]" in content  # trimmed + control char removed
    assert "HACK" not in content  # non-speaker key ignored


def test_rename_speakers_strips_markdown_metachars(client: TestClient, tmp_path) -> None:
    """A name cannot smuggle a link/code-span/tag that a non-React viewer would render."""
    note = tmp_path / "rename-md.md"
    note.write_text("[SPEAKER_00]: Hola.\n", encoding="utf-8")
    with patch(PATCH_TARGET, return_value=tmp_path):
        res = client.post(
            "/api/notes/rename-md.md/speakers",
            json={"mapping": {"SPEAKER_00": "Carlos [x](http://evil) `code`"}},
        )
    assert res.status_code == 200
    content = res.json()["content"]
    assert "Carlos" in content
    assert "](" not in content  # markdown link syntax neutralized
    assert "`" not in content  # code span neutralized


def test_rename_speakers_rejects_non_md(client: TestClient, tmp_path) -> None:
    """A non-.md filename is rejected before any filesystem access."""
    with patch(PATCH_TARGET, return_value=tmp_path):
        res = client.post(
            "/api/notes/evil.txt/speakers",
            json={"mapping": {"SPEAKER_00": "X"}},
        )
    assert res.status_code == 400


def test_rename_speakers_missing_note(client: TestClient, tmp_path) -> None:
    """A valid .md name that does not exist returns 404 (no file created)."""
    with patch(PATCH_TARGET, return_value=tmp_path):
        res = client.post(
            "/api/notes/ghost.md/speakers",
            json={"mapping": {"SPEAKER_00": "X"}},
        )
    assert res.status_code == 404
    assert not (tmp_path / "ghost.md").exists()


def test_rename_speakers_rejects_path_traversal(client: TestClient, tmp_path) -> None:
    """A traversal attempt must not write to a file outside output_dir."""
    secret = tmp_path.parent / "secret.md"
    secret.write_text("original secret", encoding="utf-8")
    with patch(PATCH_TARGET, return_value=tmp_path):
        res = client.post(
            "/api/notes/../secret.md/speakers",
            json={"mapping": {"SPEAKER_00": "PWNED"}},
        )
    assert res.status_code != 200
    # The file outside output_dir is left untouched.
    assert secret.read_text(encoding="utf-8") == "original secret"
