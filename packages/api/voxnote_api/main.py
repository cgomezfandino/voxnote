"""FastAPI application for Voxnote."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from voxnote_api.routes import config, export, health, insights, notes, ollama, transcribe


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

    from voxnote.config import settings

    @app.middleware("http")
    async def _limit_json_body(request: Request, call_next):  # type: ignore[no-untyped-def]
        # Bound JSON bodies (insights / export / export-docx) to guard against a
        # memory-exhaustion DoS. Multipart audio uploads are exempt — they use the
        # transcribe route's own upload limit. Chunked requests without Content-Length
        # bypass this; acceptable for the localhost-only threat model.
        if request.headers.get("content-type", "").startswith("application/json"):
            length = request.headers.get("content-length", "")
            if length.isdigit() and int(length) > settings.max_json_mb * 1024 * 1024:
                return JSONResponse(status_code=413, content={"detail": "Request body too large."})
        return await call_next(request)

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
    """Entry point for the ``voxnote-api`` command.

    Binds to localhost by default so the API is not exposed to the LAN. Override with
    VOXNOTE_API_HOST (e.g. "0.0.0.0") only when LAN access is explicitly wanted — note
    there is no authentication yet, so do not expose this on an untrusted network.
    """
    import os

    import uvicorn

    host = os.getenv("VOXNOTE_API_HOST", "127.0.0.1")
    port = int(os.getenv("VOXNOTE_API_PORT", "8003"))
    reload = os.getenv("VOXNOTE_API_RELOAD", "false").lower() in ("1", "true", "yes")
    uvicorn.run("voxnote_api.main:app", host=host, port=port, reload=reload)
