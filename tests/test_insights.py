"""Tests for the insight extraction module (Ollama calls mocked)."""

import json
from unittest.mock import patch, MagicMock

from voxnote.pipeline.insights import extract_insights, MAX_TRANSCRIPT_CHARS


def _mock_ollama_response(insights_dict: dict) -> MagicMock:
    """Build a fake requests.Response that mimics Ollama's API."""
    resp = MagicMock()
    resp.json.return_value = {"response": json.dumps(insights_dict)}
    resp.raise_for_status = MagicMock()
    return resp


def test_extract_returns_structured_dict(sample_insights, sample_transcript):
    """extract_insights should return the parsed JSON from Ollama."""
    mock_resp = _mock_ollama_response(sample_insights)
    with patch("voxnote.pipeline.insights.requests.post", return_value=mock_resp):
        result = extract_insights(sample_transcript)

    assert result["resumen"] == sample_insights["resumen"]
    assert len(result["action_items"]) == 2
    assert result["decisiones"][0] == "Usar JWT para autenticación"


def test_extract_strips_markdown_fences(sample_transcript):
    """Should handle Ollama wrapping JSON in ```json fences."""
    raw_with_fences = (
        '```json\n'
        '{"resumen": "test", "decisiones": [], "action_items": [],'
        ' "insights": [], "preguntas_abiertas": [], "proximos_pasos": []}'
        '\n```'
    )

    resp = MagicMock()
    resp.json.return_value = {"response": raw_with_fences}
    resp.raise_for_status = MagicMock()

    with patch("voxnote.pipeline.insights.requests.post", return_value=resp):
        result = extract_insights(sample_transcript)

    assert result["resumen"] == "test"


def test_extract_truncates_long_transcripts():
    """Transcripts longer than MAX_TRANSCRIPT_CHARS should be truncated."""
    long_text = "palabra " * 2000  # way over 4000 chars

    captured_prompt = {}

    def fake_post(_url, json, **_kwargs):
        captured_prompt["prompt"] = json["prompt"]
        resp = MagicMock()
        resp.json.return_value = {
            "response": json_stub(),
        }
        resp.raise_for_status = MagicMock()
        return resp

    with patch("voxnote.pipeline.insights.requests.post", side_effect=fake_post):
        extract_insights(long_text)

    transcript_in_prompt = captured_prompt["prompt"].split("TRANSCRIPCIÓN:\n")[-1].strip()
    assert len(transcript_in_prompt) <= MAX_TRANSCRIPT_CHARS


def test_extract_sends_correct_ollama_params(sample_transcript, monkeypatch):
    """Should send the configured model and low temperature to Ollama."""
    monkeypatch.setenv("VOXNOTE_OLLAMA_MODEL", "mistral:7b")

    captured = {}

    def fake_post(_url, json, **_kwargs):
        captured["url"] = _url
        captured["json"] = json
        resp = MagicMock()
        resp.json.return_value = {"response": json_stub()}
        resp.raise_for_status = MagicMock()
        return resp

    from voxnote.config import Settings

    new_settings = Settings()

    with patch("voxnote.pipeline.insights.settings", new_settings):
        with patch("voxnote.pipeline.insights.requests.post", side_effect=fake_post):
            extract_insights(sample_transcript)

    assert captured["json"]["model"] == "mistral:7b"
    assert captured["json"]["options"]["temperature"] == 0.1
    assert captured["json"]["stream"] is False


def json_stub() -> str:
    """Minimal valid insights JSON for mocking."""
    return json.dumps({
        "resumen": "ok",
        "decisiones": [],
        "action_items": [],
        "insights": [],
        "preguntas_abiertas": [],
        "proximos_pasos": [],
    })
