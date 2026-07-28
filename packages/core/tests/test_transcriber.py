"""Tests for the Whisper transcriber (model loading mocked)."""

from unittest.mock import MagicMock, patch

from voxnote.pipeline.models import TranscriptResult


def test_transcribe_returns_transcript_result():
    """transcribe should return a TranscriptResult with text."""
    fake_model = MagicMock()
    fake_model.transcribe.return_value = {"text": "Hello, this is a test."}

    with (
        patch("voxnote.pipeline.transcriber._BACKEND", "whisper"),
        patch("voxnote.pipeline.transcriber._transcribe_whisper") as mock_fn,
    ):
        mock_fn.return_value = TranscriptResult(text="Hello, this is a test.")
        from voxnote.pipeline.transcriber import transcribe

        result = transcribe("fake_audio.mp3")

    assert isinstance(result, TranscriptResult)
    assert result.text == "Hello, this is a test."
    assert not result.has_speakers


def test_transcribe_whisper_backend():
    """_transcribe_whisper should wrap vanilla Whisper result in TranscriptResult."""
    fake_model = MagicMock()
    fake_model.transcribe.return_value = {"text": "Test transcription"}

    whisper_mock = MagicMock()
    whisper_mock.load_model.return_value = fake_model

    with patch.dict("sys.modules", {"whisper": whisper_mock}):
        from voxnote.pipeline.transcriber import _transcribe_whisper

        result = _transcribe_whisper("audio.mp3", "turbo")

    assert isinstance(result, TranscriptResult)
    assert result.text == "Test transcription"
    assert not result.has_speakers
    assert result.segments == []
    whisper_mock.load_model.assert_called_with("turbo")


def test_transcribe_model_override():
    """Passing model_name should override the default."""
    with (
        patch("voxnote.pipeline.transcriber._BACKEND", "whisper"),
        patch("voxnote.pipeline.transcriber._transcribe_whisper") as mock_fn,
    ):
        mock_fn.return_value = TranscriptResult(text="test")
        from voxnote.pipeline.transcriber import transcribe

        transcribe("audio.mp3", model_name="tiny")

    mock_fn.assert_called_once_with("audio.mp3", "tiny")


def test_transcribe_diarize_flag():
    """diarize parameter should be passed through to whisperx backend."""
    with (
        patch("voxnote.pipeline.transcriber._BACKEND", "whisperx"),
        patch("voxnote.pipeline.transcriber._transcribe_whisperx") as mock_fn,
    ):
        mock_fn.return_value = TranscriptResult(text="test", has_speakers=True)
        from voxnote.pipeline.transcriber import transcribe

        result = transcribe("audio.mp3", diarize=True)

    mock_fn.assert_called_once_with("audio.mp3", "turbo", True)
    assert result.has_speakers


def test_transcribe_no_backend_raises():
    """Should raise ImportError if no backend is available."""
    import pytest

    with patch("voxnote.pipeline.transcriber._BACKEND", None):
        from voxnote.pipeline.transcriber import transcribe

        with pytest.raises(ImportError, match="Neither whisperx nor openai-whisper"):
            transcribe("audio.mp3")
