"""Data models for pipeline results."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Segment:
    """A single transcription segment with optional speaker label."""

    text: str
    start: float
    end: float
    speaker: str | None = None


@dataclass
class TranscriptResult:
    """Result of a transcription, with optional speaker diarization."""

    text: str
    segments: list[Segment] = field(default_factory=list)
    has_speakers: bool = False

    def to_speaker_text(self) -> str:
        """Format transcript with speaker labels.

        Merges consecutive segments from the same speaker into paragraphs.
        Falls back to plain text if no speaker info is available.
        """
        if not self.has_speakers or not self.segments:
            return self.text

        lines: list[str] = []
        current_speaker: str | None = None
        current_parts: list[str] = []

        def flush() -> None:
            # Emit the pending block whenever there is text, even when the speaker is
            # unknown (diarization leaves leading silence/overlap segments with no label).
            # Guarding on the speaker instead of the content silently drops that text.
            if current_parts:
                label = current_speaker or "SPEAKER_?"
                lines.append(f"[{label}]: {' '.join(current_parts)}")

        for seg in self.segments:
            if seg.speaker != current_speaker:
                flush()
                current_speaker = seg.speaker
                current_parts = [seg.text.strip()]
            else:
                current_parts.append(seg.text.strip())

        flush()

        return "\n\n".join(lines)
