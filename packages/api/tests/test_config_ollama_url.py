"""The Ollama URL Base is wired through PUT /api/config (was display-only before)."""

from fastapi.testclient import TestClient


def test_ollama_url_roundtrip(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"ollama_url": "http://my-ollama:1234"})
    assert res.status_code == 200
    assert res.json()["ollama_url"] == "http://my-ollama:1234"


def test_ollama_url_empty_resets_to_default(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    monkeypatch.setenv("VOXNOTE_OLLAMA_URL", "http://localhost:11434")
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    client.put("/api/config", json={"ollama_url": "http://x:1"})
    res = client.put("/api/config", json={"ollama_url": "   "})
    assert res.status_code == 200
    # A cleared field falls back to the local default, not an empty/broken URL.
    assert res.json()["ollama_url"] == "http://localhost:11434"
