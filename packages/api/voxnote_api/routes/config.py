"""Configuration endpoints."""

from __future__ import annotations

import os

from fastapi import APIRouter

from voxnote_api.schemas import ConfigResponse, ConfigUpdateRequest

router = APIRouter()

AVAILABLE_PROVIDERS = ["ollama", "openai", "kimi", "glm", "google"]


@router.get("/config", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    """Return current application settings."""
    from voxnote.config import Settings

    s = Settings()  # Re-read from env each time
    return ConfigResponse(
        whisper_model=s.whisper_model,
        language=s.language,
        llm_provider=s.llm_provider,
        ollama_model=s.ollama_model,
        ollama_url=s.ollama_url,
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        kimi_model=os.getenv("KIMI_MODEL", "moonshot-v1-8k"),
        glm_model=os.getenv("GLM_MODEL", "glm-4"),
        google_model=os.getenv("GOOGLE_MODEL", "gemini-2.0-flash-exp"),
        diarize=s.diarize,
        hf_token=s.hf_token,
        output_dir=str(s.output_dir),
        available_providers=AVAILABLE_PROVIDERS,
    )


@router.put("/config", response_model=ConfigResponse)
async def update_config(request: ConfigUpdateRequest) -> ConfigResponse:
    """Update runtime settings via environment variables."""
    if request.whisper_model is not None:
        os.environ["VOXNOTE_WHISPER_MODEL"] = request.whisper_model
    if request.language is not None:
        os.environ["VOXNOTE_LANGUAGE"] = request.language
    if request.llm_provider is not None:
        os.environ["VOXNOTE_LLM_PROVIDER"] = request.llm_provider
    if request.ollama_model is not None:
        os.environ["VOXNOTE_OLLAMA_MODEL"] = request.ollama_model
    if request.openai_model is not None:
        os.environ["OPENAI_MODEL"] = request.openai_model
    if request.kimi_model is not None:
        os.environ["KIMI_MODEL"] = request.kimi_model
    if request.glm_model is not None:
        os.environ["GLM_MODEL"] = request.glm_model
    if request.google_model is not None:
        os.environ["GOOGLE_MODEL"] = request.google_model
    if request.diarize is not None:
        os.environ["VOXNOTE_DIARIZE"] = str(request.diarize).lower()

    return await get_config()
