# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voxnote is a 100% local meeting-notes pipeline. It records audio, transcribes with Whisper (or whisperX for speaker diarization), extracts structured insights via pluggable LLM providers, and exports Obsidian-compatible Markdown notes. No data leaves the machine by default.

The project is organized as a **monorepo** with three packages:
- `packages/core` — Python pipeline (CLI, transcription, insights, export)
- `packages/api` — FastAPI backend serving the pipeline over HTTP
- `packages/web` — Next.js 14 frontend (React, TypeScript, Tailwind CSS)

## Commands

```bash
# Install everything
make install

# Run dev servers (API on :8000, Web on :3001)
make dev

# Run individual servers
make dev-api    # uvicorn on port 8000 with --reload
make dev-web    # next dev on port 3001

# Tests
make test       # all tests (core + api)
make test-core  # packages/core tests (26 tests)
make test-api   # packages/api tests (10 tests)

# Lint & format
make lint       # ruff check + eslint
make format     # ruff format
make typecheck  # mypy packages/core/

# CLI (still works)
voxnote record
voxnote transcribe audio.mp3
voxnote process audio.mp3
```

## Architecture

### Monorepo Structure

```
Voxnote/
├── packages/
│   ├── core/                    # Python pipeline
│   │   ├── voxnote/
│   │   │   ├── cli.py           # Click CLI
│   │   │   ├── config.py        # Pydantic Settings
│   │   │   ├── pipeline/        # models, transcriber, insights, exporter
│   │   │   └── providers/       # ollama, openai, kimi, glm, google
│   │   ├── tests/
│   │   └── pyproject.toml
│   ├── api/                     # FastAPI backend
│   │   ├── voxnote_api/
│   │   │   ├── main.py          # App factory + CORS + lifespan
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   └── routes/          # health, transcribe, insights, export, config, notes
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── web/                     # Next.js 14 frontend
│       ├── src/app/             # App Router (page.tsx)
│       ├── src/components/      # AudioRecorder, ConfigPanel, ProcessingSteps, etc.
│       ├── src/hooks/           # useVoxnote, useConfig
│       ├── src/lib/api.ts       # Centralized API client
│       ├── src/types/           # TypeScript interfaces
│       └── package.json
├── Makefile                     # Root: install, dev, test, lint
└── CLAUDE.md
```

### Pipeline Flow

**record → transcribe → extract_insights → export_obsidian**

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/transcribe` | Audio upload → transcription |
| POST | `/api/insights` | Transcript → structured insights |
| POST | `/api/export` | Insights → Obsidian .md note |
| GET | `/api/config` | Current settings |
| PUT | `/api/config` | Update settings |
| GET | `/api/notes` | List generated notes |
| GET | `/api/notes/{filename}` | Get note content |

### Key design patterns

- **Provider abstraction**: `providers/__init__.py:get_provider()` factory returns `LLMProvider` by name
- **TranscriptResult model**: Wraps plain text + optional speaker-labeled segments
- **Backend auto-detection**: `transcriber.py` detects whisperX vs openai-whisper at import time
- **Lazy imports**: Heavy deps (whisper, torch) imported inside functions for fast startup
- **Insights structure**: JSON dict with keys: `resumen`, `decisiones`, `action_items`, `insights`, `preguntas_abiertas`, `proximos_pasos`
- **API proxy**: Next.js rewrites `/api/*` → `localhost:8000/api/*`
- **Config sync**: Frontend config syncs to backend via `PUT /api/config` (debounced)

## Configuration

All settings via `pydantic-settings` with `VOXNOTE_` prefix:

| Env var | Default | Purpose |
|---------|---------|---------|
| `VOXNOTE_LLM_PROVIDER` | `ollama` | LLM provider |
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Whisper model size |
| `VOXNOTE_LANGUAGE` | `es` | Audio language |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Ollama model |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `VOXNOTE_DIARIZE` | `false` | Enable speaker diarization |
| `VOXNOTE_HF_TOKEN` | | HuggingFace token for diarization |
| `VOXNOTE_OUTPUT_DIR` | `output` | Where notes are saved |

## Environment & Setup

- **Python** >=3.10
- **Node.js** >=18
- **Virtual env**: `.venv/` → `source .venv/bin/activate`
- **External deps**: `ffmpeg`, Ollama on `localhost:11434`

## Conventions

- Formatting: `ruff format` (Python), Prettier via ESLint (TypeScript) — line length 100
- Type hints on all public functions; `mypy --strict` for Python, `strict: true` for TypeScript
- Lazy imports for heavy deps in CLI commands
- Console output via `rich.console.Console`
- Paths via `pathlib.Path`
- Documentation language: Spanish. Code and comments: English.
- Tests mock external services; shared fixtures in `conftest.py`
- React components use `"use client"` directive for client-side interactivity
- API client centralized in `src/lib/api.ts`
