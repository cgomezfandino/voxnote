"""Tests for configuration loading."""

from voxnote.config import Settings


def test_defaults():
    """Settings should load with sensible defaults."""
    s = Settings()
    assert s.whisper_model == "turbo"
    assert s.language == "es"
    assert s.ollama_model == "llama3.1:8b"
    assert s.ollama_url == "http://localhost:11434"
    assert s.sample_rate == 16_000


def test_env_override(monkeypatch):
    """Settings should be overridable via VOXNOTE_* env vars."""
    monkeypatch.setenv("VOXNOTE_WHISPER_MODEL", "large-v3")
    monkeypatch.setenv("VOXNOTE_LANGUAGE", "en")
    monkeypatch.setenv("VOXNOTE_OLLAMA_MODEL", "mistral:7b")

    s = Settings()
    assert s.whisper_model == "large-v3"
    assert s.language == "en"
    assert s.ollama_model == "mistral:7b"


def test_empty_language_for_autodetect(monkeypatch):
    """Empty VOXNOTE_LANGUAGE should enable Whisper auto-detection."""
    monkeypatch.setenv("VOXNOTE_LANGUAGE", "")
    s = Settings()
    assert s.language == ""
