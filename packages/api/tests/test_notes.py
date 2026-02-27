"""Tests for notes endpoints."""

from pathlib import Path
from unittest.mock import patch


def test_list_notes_empty(client, tmp_path):
    """GET /api/notes should return empty list when no notes exist."""
    with patch("voxnote_api.routes.notes._get_output_dir", return_value=tmp_path):
        response = client.get("/api/notes")
    assert response.status_code == 200
    assert response.json() == []


def test_list_notes_with_files(client, tmp_path):
    """GET /api/notes should list existing markdown notes."""
    note = tmp_path / "2026-02-27_test-meeting.md"
    note.write_text(
        "---\ntags: [meeting]\ndate: 2026-02-27\n---\n\n"
        "# Meeting\n\nSome content here.\n"
    )

    with patch("voxnote_api.routes.notes._get_output_dir", return_value=tmp_path):
        response = client.get("/api/notes")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "2026-02-27_test-meeting.md"
    assert "created_at" in data[0]
    assert "size_bytes" in data[0]
    assert "Some content here" in data[0]["preview"]


def test_get_note(client, tmp_path):
    """GET /api/notes/{filename} should return note content."""
    note = tmp_path / "2026-02-27_test.md"
    note.write_text("# Test note\n\nContent here.")

    with patch("voxnote_api.routes.notes._get_output_dir", return_value=tmp_path):
        response = client.get("/api/notes/2026-02-27_test.md")

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "2026-02-27_test.md"
    assert "Content here" in data["content"]


def test_get_note_not_found(client, tmp_path):
    """GET /api/notes/{filename} should return 404 for missing notes."""
    with patch("voxnote_api.routes.notes._get_output_dir", return_value=tmp_path):
        response = client.get("/api/notes/nonexistent.md")

    assert response.status_code == 404


def test_get_note_path_traversal(client, tmp_path):
    """GET /api/notes/{filename} should reject path traversal attempts."""
    # Create a file outside the output dir
    secret = tmp_path.parent / "secret.md"
    secret.write_text("secret data")

    with patch("voxnote_api.routes.notes._get_output_dir", return_value=tmp_path):
        response = client.get("/api/notes/../secret.md")

    assert response.status_code in (403, 404)
