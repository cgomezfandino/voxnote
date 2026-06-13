"""Ollama endpoints for model discovery."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException
from voxnote.config import settings

router = APIRouter()


@router.get("/models")
async def list_models() -> list[dict[str, str]]:
    """Fetch installed models from the configured Ollama server."""
    url = f"{settings.ollama_url.rstrip('/')}/api/tags"

    headers = {}
    if settings.ollama_api_key:
        headers["Authorization"] = f"Bearer {settings.ollama_api_key}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            data = response.json()
            models = data.get("models", [])

            # Format to match frontend structure: [{ value: "llama3:8b", label: "llama3:8b" }]
            # If we wanted prettier labels, we could map them here, but exact model tag is safest.
            return [{"value": m["name"], "label": m["name"]} for m in models]

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Ollama server at {settings.ollama_url}: {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
