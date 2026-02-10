"""Tests for pipeline data models."""

from voxnote.pipeline.models import Segment, TranscriptResult


def test_transcript_result_text_only():
    """TranscriptResult with no segments returns plain text."""
    tr = TranscriptResult(text="Hello world")
    assert tr.to_speaker_text() == "Hello world"
    assert not tr.has_speakers


def test_transcript_result_speaker_text():
    """to_speaker_text formats speaker labels correctly."""
    tr = TranscriptResult(
        text="Hello. Goodbye.",
        segments=[
            Segment(text="Hello.", start=0, end=1, speaker="SPEAKER_00"),
            Segment(text="Goodbye.", start=1, end=2, speaker="SPEAKER_01"),
        ],
        has_speakers=True,
    )
    result = tr.to_speaker_text()
    assert "[SPEAKER_00]: Hello." in result
    assert "[SPEAKER_01]: Goodbye." in result


def test_transcript_result_merges_same_speaker():
    """Consecutive segments from same speaker are merged."""
    tr = TranscriptResult(
        text="A B C",
        segments=[
            Segment(text="A", start=0, end=1, speaker="SPEAKER_00"),
            Segment(text="B", start=1, end=2, speaker="SPEAKER_00"),
            Segment(text="C", start=2, end=3, speaker="SPEAKER_01"),
        ],
        has_speakers=True,
    )
    result = tr.to_speaker_text()
    assert "[SPEAKER_00]: A B" in result
    assert "[SPEAKER_01]: C" in result


def test_transcript_result_no_speakers_fallback():
    """has_speakers=False should return plain text even with segments."""
    tr = TranscriptResult(
        text="Plain text fallback",
        segments=[
            Segment(text="Plain text fallback", start=0, end=3),
        ],
        has_speakers=False,
    )
    assert tr.to_speaker_text() == "Plain text fallback"


def test_transcript_result_empty_segments():
    """Empty segments list with has_speakers=True should return plain text."""
    tr = TranscriptResult(text="Fallback", segments=[], has_speakers=True)
    assert tr.to_speaker_text() == "Fallback"
