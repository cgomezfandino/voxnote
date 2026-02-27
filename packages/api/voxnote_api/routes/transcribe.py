"""Transcription endpoint."""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from voxnote_api.schemas import SegmentResponse, TranscriptionResponse

router = APIRouter()


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    model: str = Form("turbo"),
    language: str = Form("es"),
    diarize: str = Form("false"),
) -> TranscriptionResponse:
    """Transcribe an uploaded audio file with Whisper."""
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        from voxnote.pipeline.transcriber import transcribe as do_transcribe

        should_diarize = diarize.lower() in ("true", "1", "yes")

        # Run CPU-bound transcription in a thread pool
        result = await asyncio.to_thread(
            do_transcribe,
            tmp_path,
            model_name=model,
            diarize=should_diarize,
        )

        segments = [
            SegmentResponse(
                text=seg.text,
                start=seg.start,
                end=seg.end,
                speaker=seg.speaker,
            )
            for seg in result.segments
        ]

        return TranscriptionResponse(
            text=result.text,
            segments=segments,
            has_speakers=result.has_speakers,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Transcription failed: {e}"
        ) from e
    finally:
        Path(tmp_path).unlink(missing_ok=True)
