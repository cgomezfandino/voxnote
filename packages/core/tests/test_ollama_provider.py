"""Tests for the Ollama provider HTTP request shape."""

from unittest.mock import MagicMock, patch

from voxnote.providers.ollama import OllamaProvider


def test_ollama_request_uses_json_format():
    """The /api/generate request must set format='json' so small local models
    return parseable JSON instead of prose (validated 2026-06-15: gemma4:e4b
    returned 200 but unparseable output without it)."""
    fake_resp = MagicMock()
    fake_resp.raise_for_status.return_value = None
    fake_resp.json.return_value = {"response": '{"resumen": "ok"}'}

    with patch("voxnote.providers.ollama.requests.post", return_value=fake_resp) as mock_post:
        result = OllamaProvider().extract_insights("Una reunión de prueba.")

    assert result["resumen"] == "ok"
    payload = mock_post.call_args.kwargs["json"]
    assert payload.get("format") == "json", "Ollama request should constrain output to JSON"
