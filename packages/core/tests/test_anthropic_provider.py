"""Tests for the Anthropic (Claude) provider.

The `anthropic` package is an optional extra, so CI does not install it. These tests
inject a fake `anthropic` module via sys.modules instead of importing the real SDK, so
they pass whether or not the extra is present.
"""

import sys
from unittest.mock import MagicMock

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

    fake_anthropic = MagicMock()
    fake_anthropic.Anthropic.return_value.messages.create.return_value = fake_msg
    monkeypatch.setitem(sys.modules, "anthropic", fake_anthropic)

    result = AnthropicProvider().extract_insights("Una reunión de prueba.")

    assert result["resumen"] == "ok"
    create = fake_anthropic.Anthropic.return_value.messages.create
    assert create.call_args.kwargs["model"] == "claude-opus-4-8"
    # Opus 4.8 rejects sampling params — they must NOT be sent.
    assert "temperature" not in create.call_args.kwargs


def test_get_provider_returns_anthropic(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    from voxnote.providers import AnthropicProvider as Exported
    from voxnote.providers import get_provider

    assert isinstance(get_provider("anthropic"), Exported)
