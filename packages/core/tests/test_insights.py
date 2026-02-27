"""Tests for the insight extraction module (provider-based)."""

import json
from unittest.mock import patch, MagicMock

from voxnote.pipeline.insights import extract_insights


def test_extract_calls_provider():
    """extract_insights should use the configured provider."""
    mock_provider = MagicMock()
    mock_provider.extract_insights.return_value = {
        "resumen": "Test summary",
        "decisiones": [],
        "action_items": [],
        "insights": [],
        "preguntas_abiertas": [],
        "proximos_pasos": [],
    }

    with patch("voxnote.pipeline.insights.get_provider", return_value=mock_provider):
        result = extract_insights("Test transcript")

    assert result["resumen"] == "Test summary"
    mock_provider.extract_insights.assert_called_once_with("Test transcript")


def test_extract_uses_provider_override():
    """Provider can be overridden via parameter."""
    mock_provider = MagicMock()
    mock_provider.extract_insights.return_value = {
        "resumen": "OpenAI summary",
        "decisiones": [],
        "action_items": [],
        "insights": [],
        "preguntas_abiertas": [],
        "proximos_pasos": [],
    }

    with patch("voxnote.pipeline.insights.get_provider", return_value=mock_provider) as mock_get:
        result = extract_insights("Test transcript", provider_name="openai")

    mock_get.assert_called_once_with("openai")
    assert result["resumen"] == "OpenAI summary"


def test_extract_uses_settings_by_default():
    """If no provider_name, should use settings.llm_provider."""
    mock_provider = MagicMock()
    mock_provider.extract_insights.return_value = {
        "resumen": "Ollama summary",
        "decisiones": [],
        "action_items": [],
        "insights": [],
        "preguntas_abiertas": [],
        "proximos_pasos": [],
    }

    with patch("voxnote.pipeline.insights.settings") as mock_settings:
        mock_settings.llm_provider = "ollama"
        with patch("voxnote.pipeline.insights.get_provider", return_value=mock_provider) as mock_get:
            extract_insights("Test transcript")

        mock_get.assert_called_once_with("ollama")
