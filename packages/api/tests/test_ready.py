"""/api/ready reports real component readiness for the desktop shell's splash gate."""

from fastapi.testclient import TestClient


def test_ready_reports_component_state(tmp_path, monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OUTPUT_DIR", str(tmp_path))
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.get("/api/ready")
    assert res.status_code == 200
    body = res.json()
    # Shell uses this (not /api/health) to know the app is actually usable.
    assert {"ok", "ollama_reachable", "output_dir_writable"}.issubset(body.keys())
    assert isinstance(body["ok"], bool)
    # The tmp output dir is writable, so that component is ready.
    assert body["output_dir_writable"] is True
