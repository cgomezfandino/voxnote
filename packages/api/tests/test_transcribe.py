"""Tests for transcription endpoint."""

import io
from unittest.mock import patch

from voxnote.pipeline.models import Segment, TranscriptResult


def test_transcribe_audio(client):
    """POST /api/transcribe should accept audio and return transcription."""
    mock_result = TranscriptResult(
        text="Hola, esto es una prueba.",
        segments=[
            Segment(text="Hola, esto es una prueba.", start=0.0, end=2.5, speaker=None),
        ],
        has_speakers=False,
    )

    with patch(
        "voxnote.pipeline.transcriber.transcribe",
        return_value=mock_result,
    ):
        response = client.post(
            "/api/transcribe",
            files={"audio": ("test.wav", io.BytesIO(b"fake audio data"), "audio/wav")},
            data={"model": "turbo", "language": "es", "diarize": "false"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "Hola" in data["text"]
    assert data["has_speakers"] is False
    assert len(data["segments"]) == 1


def test_transcribe_with_diarization(client):
    """POST /api/transcribe with diarize=true should return speaker labels."""
    mock_result = TranscriptResult(
        text="Buenos días. Hola.",
        segments=[
            Segment(text="Buenos días.", start=0.0, end=1.0, speaker="SPEAKER_00"),
            Segment(text="Hola.", start=1.5, end=2.0, speaker="SPEAKER_01"),
        ],
        has_speakers=True,
    )

    with patch(
        "voxnote.pipeline.transcriber.transcribe",
        return_value=mock_result,
    ):
        response = client.post(
            "/api/transcribe",
            files={"audio": ("meeting.mp3", io.BytesIO(b"fake"), "audio/mpeg")},
            data={"model": "large-v3", "language": "es", "diarize": "true"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["has_speakers"] is True
    assert data["segments"][0]["speaker"] == "SPEAKER_00"
    assert data["segments"][1]["speaker"] == "SPEAKER_01"
