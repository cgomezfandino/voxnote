"""Transcription endpoint."""

from __future__ import annotations

import asyncio
import logging
import os
import re
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from voxnote_api.schemas import SegmentResponse, TranscriptionResponse

router = APIRouter()
logger = logging.getLogger("voxnote_api")

# Cap uploads to avoid disk-exhaustion / OOM DoS. Override via VOXNOTE_MAX_UPLOAD_MB.
MAX_UPLOAD_MB = int(os.getenv("VOXNOTE_MAX_UPLOAD_MB", "500"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024


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
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}",
        )

    # Ensure output/audio directory exists (owner-only access to private recordings)
    audio_dir = settings.output_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    try:
        audio_dir.chmod(0o700)
    except OSError:
        pass

    orig_name = Path(audio.filename or "recording.wav").name
    # Sanitize: the uploaded name reaches the note's YAML frontmatter, so strip anything
    # but filename-safe characters (newlines/metacharacters would corrupt the frontmatter).
    orig_name = re.sub(r"[^A-Za-z0-9_.-]", "_", orig_name)
    if orig_name in ("blob", "") or not orig_name.strip("_"):
        orig_name = f"grabacion{suffix}"

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    saved_filename = f"{timestamp}_{orig_name}"
    saved_path = audio_dir / saved_filename

    # Read with a hard size cap so a huge upload cannot exhaust memory/disk.
    content = bytearray()
    while True:
        chunk = await audio.read(1024 * 1024)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio file too large (max {MAX_UPLOAD_MB} MB).",
            )

    try:
        with open(saved_path, "wb") as f:
            f.write(content)
        os.chmod(saved_path, 0o600)
    except OSError as e:
        logger.exception("Failed to save uploaded audio to disk")
        raise HTTPException(status_code=500, detail="Failed to save audio file to disk.") from e

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
        logger.exception("Transcription failed")
        raise HTTPException(
            status_code=500,
            detail="Transcription failed. Check server logs for details.",
        ) from e
