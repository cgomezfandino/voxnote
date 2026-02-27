"""Tests for config endpoints."""


def test_get_config(client):
    """GET /api/config should return current settings."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()

    assert "whisper_model" in data
    assert "llm_provider" in data
    assert "available_providers" in data
    assert isinstance(data["available_providers"], list)
    assert "ollama" in data["available_providers"]


def test_update_config(client):
    """PUT /api/config should update settings and return new values."""
    response = client.put(
        "/api/config",
        json={"whisper_model": "small", "language": "en"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["whisper_model"] == "small"
    assert data["language"] == "en"
