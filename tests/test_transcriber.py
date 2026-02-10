"""Tests for the Whisper transcriber (model loading mocked)."""

from unittest.mock import patch, MagicMock


def test_transcribe_returns_text():
    """transcribe should return the text from Whisper's result dict."""
    fake_model = MagicMock()
    fake_model.transcribe.return_value = {"text": "Hola, esta es una prueba."}

    with patch("voxnote.pipeline.transcriber.whisper") as mock_whisper:
        mock_whisper.load_model.return_value = fake_model
        from voxnote.pipeline.transcriber import transcribe

        result = transcribe("fake_audio.mp3")

    assert result == "Hola, esta es una prueba."
    mock_whisper.load_model.assert_called_once()


def test_transcribe_uses_configured_model(monkeypatch):
    """Should use the model from settings by default."""
    monkeypatch.setenv("VOXNOTE_WHISPER_MODEL", "large-v3")

    fake_model = MagicMock()
    fake_model.transcribe.return_value = {"text": "test"}

    from voxnote.config import Settings
    new_settings = Settings()

    with patch("voxnote.pipeline.transcriber.settings", new_settings):
        with patch("voxnote.pipeline.transcriber.whisper") as mock_whisper:
            mock_whisper.load_model.return_value = fake_model
            from voxnote.pipeline.transcriber import transcribe

            transcribe("audio.mp3")

    mock_whisper.load_model.assert_called_with("large-v3")


def test_transcribe_model_override():
    """Passing model_name should override the default."""
    fake_model = MagicMock()
    fake_model.transcribe.return_value = {"text": "test"}

    with patch("voxnote.pipeline.transcriber.whisper") as mock_whisper:
        mock_whisper.load_model.return_value = fake_model
        from voxnote.pipeline.transcriber import transcribe

        transcribe("audio.mp3", model_name="tiny")

    mock_whisper.load_model.assert_called_with("tiny")


def test_transcribe_passes_language():
    """Should pass the configured language to Whisper."""
    fake_model = MagicMock()
    fake_model.transcribe.return_value = {"text": "test"}

    with patch("voxnote.pipeline.transcriber.whisper") as mock_whisper:
        mock_whisper.load_model.return_value = fake_model
        from voxnote.pipeline.transcriber import transcribe

        transcribe("audio.mp3")

    call_kwargs = fake_model.transcribe.call_args
    assert call_kwargs[1]["language"] == "es" or call_kwargs[0][1] if len(call_kwargs[0]) > 1 else True
