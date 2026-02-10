"""Tests for configuration loading."""

from voxnote.config import Settings


def test_defaults(monkeypatch):
    """Settings should load with sensible defaults when no .env exists."""
    # Clear any existing .env values
    monkeypatch.delenv("VOXNOTE_WHISPER_MODEL", raising=False)
    monkeypatch.delenv("VOXNOTE_OLLAMA_MODEL", raising=False)

    s = Settings(_env_file=None)  # Don't load .env
    assert s.whisper_model == "turbo"
    assert s.language == "es"
    assert s.ollama_model == "llama3.1:8b"
    assert s.ollama_url == "http://localhost:11434"
    assert s.sample_rate == 16_000
    assert s.llm_provider == "ollama"
    assert s.diarize is False
    assert s.hf_token == ""
    assert s.diarize_min_speakers == 2
    assert s.diarize_max_speakers == 5
    assert s.compute_type == "int8"


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
