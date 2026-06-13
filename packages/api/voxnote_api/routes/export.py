"""Export endpoint for Obsidian note generation."""

from __future__ import annotations

import asyncio
import logging
import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from voxnote_api.schemas import DocxExportRequest, ExportRequest, ExportResponse

router = APIRouter()
logger = logging.getLogger("voxnote_api")

DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


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
        logger.exception("Obsidian export failed")
        raise HTTPException(
            status_code=500, detail="Export failed. Check server logs for details."
        ) from e


@router.post("/export/docx")
async def export_note_docx(request: DocxExportRequest) -> Response:
    """Convert a note's Markdown into a downloadable Word (.docx) document."""
    try:
        from voxnote.pipeline.docx_exporter import markdown_to_docx

        data = await asyncio.to_thread(markdown_to_docx, request.content)
    except Exception as e:
        logger.exception("Word (.docx) export failed")
        raise HTTPException(
            status_code=500, detail="Word export failed. Check server logs for details."
        ) from e

    base = (request.filename or "nota").rsplit(".", 1)[0] or "nota"
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", base) or "nota"
    return Response(
        content=data,
        media_type=DOCX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{safe}.docx"'},
    )
