"""Transcription endpoint."""

from __future__ import annotations

import asyncio
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
    """Transcribe an uploaded audio file with Whisper and save a copy permanently."""
    from datetime import datetime
    from voxnote.config import settings

    suffix = Path(audio.filename or "audio.wav").suffix.lower() or ".wav"
    allowed_extensions = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm"}
    if suffix not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")

    # Ensure output/audio directory exists
    audio_dir = settings.output_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    orig_name = Path(audio.filename or "recording.wav").name
    if orig_name == "blob" or not orig_name:
        orig_name = f"grabacion{suffix}"

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    saved_filename = f"{timestamp}_{orig_name}"
    saved_path = audio_dir / saved_filename

    try:
        content = await audio.read()
        with open(saved_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file to disk: {e}")

    try:
        from voxnote.pipeline.transcriber import transcribe as do_transcribe

        should_diarize = diarize.lower() in ("true", "1", "yes")

        # Run CPU-bound transcription in a thread pool
        result = await asyncio.to_thread(
            do_transcribe,
            str(saved_path),
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
            audio_filename=saved_filename,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Transcription failed: {e}"
        ) from e
