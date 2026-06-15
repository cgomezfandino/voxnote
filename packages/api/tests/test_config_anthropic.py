"""anthropic_model is exposed in config and the anthropic provider is allowed."""

from fastapi.testclient import TestClient


def test_anthropic_model_roundtrip_and_provider_allowed(monkeypatch):
    monkeypatch.delenv("VOXNOTE_API_TOKEN", raising=False)
    from voxnote_api.main import create_app

    client = TestClient(create_app())
    res = client.put(
        "/api/config",
        json={"llm_provider": "anthropic", "anthropic_model": "claude-sonnet-4-6"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["anthropic_model"] == "claude-sonnet-4-6"
    assert body["llm_provider"] == "anthropic"
    assert "anthropic" in body["available_providers"]
