# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voxnote is a 100% local meeting-notes pipeline. It records audio, transcribes with OpenAI Whisper, extracts structured insights via Ollama (local LLM), and exports Obsidian-compatible Markdown notes. No data leaves the machine.

## Environment & Setup

- **Python** >=3.10 (dev environment uses 3.14 via Homebrew)
- **Virtual env**: `.venv/` → `source .venv/bin/activate`
- **Install**: `pip install -e ".[dev]"`
- **External deps**: `ffmpeg` (required by Whisper), Ollama running on `localhost:11434`

## Commands

```bash
# Install (editable + dev tools)
pip install -e ".[dev]"

# CLI
voxnote record                        # record from mic (Ctrl-C to stop)
voxnote transcribe audio.mp3          # transcribe only
voxnote process audio.mp3             # full pipeline: transcribe → insights → note

# Lint & format
ruff check src/ tests/
ruff format src/ tests/

# Tests
pytest                                # all tests
pytest tests/test_exporter.py -k name # single test

# Type check
mypy src/
```

## Architecture

```
src/voxnote/
├── cli.py              ← Click CLI entry point (voxnote command)
├── config.py           ← Pydantic settings (env vars prefixed VOXNOTE_)
└── pipeline/
    ├── recorder.py     ← Microphone capture via sounddevice → .wav
    ├── transcriber.py  ← Whisper model loading + transcription
    ├── insights.py     ← Ollama API call, JSON prompt, response parsing
    └── exporter.py     ← Obsidian Markdown note generation
```

Pipeline flow: **record → transcribe → extract_insights → export_obsidian**

## Configuration

All settings live in `config.py` as `pydantic-settings`. Override via env vars:

| Env var | Default | Purpose |
|---------|---------|---------|
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Whisper model size |
| `VOXNOTE_LANGUAGE` | `es` | Audio language (empty = auto-detect) |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Local LLM for insights |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `VOXNOTE_OUTPUT_DIR` | `output` | Where notes are saved |

## Conventions

- `src/` layout with `pyproject.toml` (no setup.py)
- Formatting: `ruff format` — Linting: `ruff check`
- Type hints on all public functions
- Lazy imports for heavy deps (whisper, torch) in CLI commands to keep startup fast
