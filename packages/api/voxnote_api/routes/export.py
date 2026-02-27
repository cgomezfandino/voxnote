"""Export endpoint for Obsidian note generation."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException

from voxnote_api.schemas import ExportRequest, ExportResponse

router = APIRouter()


@router.post("/export", response_model=ExportResponse)
async def export_note(request: ExportRequest) -> ExportResponse:
    """Generate an Obsidian Markdown note from insights."""
    try:
        from voxnote.pipeline.exporter import export_obsidian

        note_path = await asyncio.to_thread(
            export_obsidian,
            insights=request.insights,
            transcript=request.transcript_text,
            audio_name=request.audio_name,
        )

        content = note_path.read_text(encoding="utf-8")

        return ExportResponse(
            filename=note_path.name,
            content=content,
            path=str(note_path),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Export failed: {e}"
        ) from e
