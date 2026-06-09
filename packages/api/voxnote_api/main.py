"""FastAPI application for Voxnote."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from voxnote_api.routes import config, export, health, insights, notes, transcribe, ollama


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown."""
    from voxnote.config import settings

    settings.output_dir.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Voxnote API",
        version="0.1.0",
        description="Local meeting transcription and insight extraction",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3003",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(transcribe.router, prefix="/api", tags=["transcribe"])
    app.include_router(insights.router, prefix="/api", tags=["insights"])
    app.include_router(export.router, prefix="/api", tags=["export"])
    app.include_router(config.router, prefix="/api", tags=["config"])
    app.include_router(notes.router, prefix="/api", tags=["notes"])
    app.include_router(ollama.router, prefix="/api/ollama", tags=["ollama"])

    return app


app = create_app()


def run() -> None:
    """Entry point for voxnote-api command."""
    import uvicorn

    uvicorn.run("voxnote_api.main:app", host="0.0.0.0", port=8003, reload=True)
