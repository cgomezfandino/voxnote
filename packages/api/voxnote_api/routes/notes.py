"""Notes listing and retrieval endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from voxnote_api.schemas import NoteDetailResponse, NoteListItem

router = APIRouter()


def _get_output_dir() -> Path:
    """Get the configured output directory."""
    from voxnote.config import Settings

    return Settings().output_dir


def _extract_preview(content: str, max_len: int = 150) -> str:
    """Extract a preview from markdown content, skipping frontmatter."""
    lines: list[str] = []
    in_frontmatter = False

    for line in content.split("\n"):
        stripped = line.strip()
        if stripped == "---":
            in_frontmatter = not in_frontmatter
            continue
        if not in_frontmatter and stripped and not stripped.startswith("#"):
            lines.append(stripped)
            if len(lines) >= 2:
                break

    return " ".join(lines)[:max_len]


@router.get("/notes", response_model=list[NoteListItem])
async def list_notes() -> list[NoteListItem]:
    """List all generated meeting notes, newest first."""
    output_dir = _get_output_dir()
    if not output_dir.exists():
        return []

    notes = sorted(
        output_dir.glob("*.md"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    items = []
    for note_path in notes:
        content = note_path.read_text(encoding="utf-8")
        stat = note_path.stat()
        created_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        preview = _extract_preview(content)

        items.append(
            NoteListItem(
                filename=note_path.name,
                created_at=created_at,
                preview=preview,
                size_bytes=stat.st_size,
            )
        )

    return items


@router.get("/notes/{filename}", response_model=NoteDetailResponse)
async def get_note(filename: str) -> NoteDetailResponse:
    """Get a specific note's full content."""
    output_dir = _get_output_dir()
    note_path = output_dir / filename

    if not note_path.exists() or not note_path.is_file():
        raise HTTPException(status_code=404, detail=f"Note '{filename}' not found")

    # Prevent path traversal attacks
    if not note_path.resolve().is_relative_to(output_dir.resolve()):
        raise HTTPException(status_code=403, detail="Access denied")

    content = note_path.read_text(encoding="utf-8")
    stat = note_path.stat()
    created_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

    return NoteDetailResponse(
        filename=note_path.name,
        content=content,
        created_at=created_at,
    )
