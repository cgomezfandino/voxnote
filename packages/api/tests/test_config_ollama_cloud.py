"""The ollama-cloud provider is accepted and advertised by the config API."""

from fastapi.testclient import TestClient


def test_ollama_cloud_provider_allowed(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put("/api/config", json={"llm_provider": "ollama-cloud"})
    assert res.status_code == 200
    body = res.json()
    assert body["llm_provider"] == "ollama-cloud"
    assert "ollama-cloud" in body["available_providers"]
