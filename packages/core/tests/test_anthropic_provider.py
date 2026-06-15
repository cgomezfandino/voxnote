"""Tests for the Anthropic (Claude) provider."""

from unittest.mock import MagicMock, patch

import pytest
from voxnote.providers.anthropic import AnthropicProvider


def test_requires_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError):
        AnthropicProvider()


def test_extract_parses_text_block(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-opus-4-8")

    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = '{"resumen": "ok"}'
    fake_msg = MagicMock()
    fake_msg.content = [text_block]
    fake_client = MagicMock()
    fake_client.messages.create.return_value = fake_msg

    with patch("anthropic.Anthropic", return_value=fake_client):
        result = AnthropicProvider().extract_insights("Una reunión de prueba.")

    assert result["resumen"] == "ok"
    kwargs = fake_client.messages.create.call_args.kwargs
    assert kwargs["model"] == "claude-opus-4-8"
    # Opus 4.8 rejects sampling params — they must NOT be sent.
    assert "temperature" not in kwargs


def test_get_provider_returns_anthropic(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    from voxnote.providers import AnthropicProvider as Exported
    from voxnote.providers import get_provider

    assert isinstance(get_provider("anthropic"), Exported)
