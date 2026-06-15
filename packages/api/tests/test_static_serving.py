"""The packaged app serves the exported Next.js UI same-origin with the API."""

from fastapi.testclient import TestClient


def test_serves_index_when_web_dir_set(tmp_path, monkeypatch):
    web = tmp_path / "web_static"
    web.mkdir()
    (web / "index.html").write_text("<!doctype html><title>voxnote</title>", encoding="utf-8")
    monkeypatch.setenv("VOXNOTE_WEB_DIR", str(web))

    # Import the factory fresh so the env var is read at app-creation time.
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    # /api still wins over the static mount
    assert client.get("/api/health").status_code == 200
    # Root serves the SPA index
    root = client.get("/")
    assert root.status_code == 200
    assert "voxnote" in root.text


def test_no_static_mount_without_env(monkeypatch):
    monkeypatch.delenv("VOXNOTE_WEB_DIR", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    assert client.get("/api/health").status_code == 200
    # No static dir -> root is a 404 (API-only mode, unchanged dev behavior)
    assert client.get("/").status_code == 404
