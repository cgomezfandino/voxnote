# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voxnote is a 100% local meeting-notes pipeline. It records audio, transcribes with Whisper (or whisperX for speaker diarization), extracts structured insights via pluggable LLM providers, and exports Obsidian-compatible Markdown notes. No data leaves the machine by default.

## Commands

```bash
# Install (editable + dev tools)
pip install -e ".[dev]"

# CLI
voxnote record                        # record from mic (Ctrl-C to stop)
voxnote transcribe audio.mp3          # transcribe only
voxnote transcribe audio.mp3 --diarize  # transcribe with speaker identification
voxnote process audio.mp3             # full pipeline: transcribe → insights → note

# Streamlit UI
pip install -e ".[ui]"
voxnote-ui                            # or: streamlit run src/voxnote/ui.py

# Lint & format
ruff check src/ tests/
ruff format src/ tests/

# Tests
pytest                                # all tests
pytest tests/test_exporter.py         # single file
pytest -k test_name                   # single test by name

# Type check
mypy src/

# Makefile shortcuts: make dev | make lint | make format | make test | make typecheck
```

## Architecture

Pipeline flow: **record → transcribe → extract_insights → export_obsidian**

```
src/voxnote/
├── cli.py              ← Click CLI (voxnote command group: record, transcribe, process)
├── config.py           ← Pydantic Settings (env vars prefixed VOXNOTE_, reads .env)
├── ui.py               ← Streamlit web UI (voxnote-ui entry point)
├── pipeline/
│   ├── models.py       ← TranscriptResult + Segment dataclasses (speaker diarization data)
│   ├── recorder.py     ← Microphone capture via sounddevice → .wav
│   ├── transcriber.py  ← Whisper/whisperX transcription + optional diarization
│   ├── insights.py     ← Delegates to providers via get_provider() factory
│   └── exporter.py     ← Obsidian Markdown note with YAML frontmatter
└── providers/
    ├── base.py         ← LLMProvider ABC (extract_insights, name, supports_streaming)
    ├── ollama.py       ← Local Ollama (default) — POST /api/generate, JSON repair
    ├── openai.py       ← OpenAI API
    ├── kimi.py         ← Moonshot/Kimi API
    ├── glm.py          ← Zhipu GLM API
    └── google.py       ← Google Gemini API
```

### Key design patterns

- **Provider abstraction**: `providers/__init__.py:get_provider()` is a factory that returns an `LLMProvider` by name. All providers implement `extract_insights(transcript) → dict`. Adding a provider means subclassing `LLMProvider` and registering in the factory dict.
- **Transcription result model**: `TranscriptResult` wraps plain text + optional speaker-labeled `Segment` list. The `to_speaker_text()` method merges consecutive same-speaker segments. Both CLI and exporter handle the `TranscriptResult` type.
- **Backend auto-detection**: `transcriber.py` detects whisperX vs openai-whisper at import time. whisperX enables alignment + diarization; vanilla whisper is the fallback.
- **Lazy imports**: Heavy deps (whisper, torch, provider SDKs) are imported inside functions/commands, not at module level, to keep CLI startup fast.
- **Insights output structure**: All providers return the same JSON dict with keys: `resumen`, `decisiones`, `action_items`, `insights`, `preguntas_abiertas`, `proximos_pasos`. Output language is Spanish.

## Configuration

All settings in `config.py` via `pydantic-settings`. Override with env vars or `.env` file (see `.env.example`):

| Env var | Default | Purpose |
|---------|---------|---------|
| `VOXNOTE_LLM_PROVIDER` | `ollama` | LLM provider: ollama\|openai\|kimi\|glm\|google |
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Whisper model size |
| `VOXNOTE_LANGUAGE` | `es` | Audio language (empty = auto-detect) |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Ollama model for insights |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `VOXNOTE_DIARIZE` | `false` | Enable speaker diarization (requires whisperx + HF token) |
| `VOXNOTE_HF_TOKEN` | | HuggingFace token for pyannote diarization |
| `VOXNOTE_OUTPUT_DIR` | `output` | Where notes are saved |

Cloud provider API keys use their own env vars (e.g., `OPENAI_API_KEY`, `KIMI_API_KEY`, `GLM_API_KEY`, `GOOGLE_API_KEY`).

## Environment & Setup

- **Python** >=3.10 (dev uses 3.14 via Homebrew)
- **Virtual env**: `.venv/` → `source .venv/bin/activate`
- **External deps**: `ffmpeg` (required by Whisper), Ollama on `localhost:11434` (for default provider)
- **Optional extras**: `pip install -e ".[ui]"` for Streamlit, `pip install -e ".[whisperx]"` for diarization, `pip install -e ".[all-providers]"` for all LLM SDKs

## Conventions

- `src/` layout with `pyproject.toml` (no setup.py)
- Formatting: `ruff format` — Linting: `ruff check` — line length 100
- Type hints on all public functions; `mypy --strict`
- Lazy imports for heavy deps (whisper, torch, provider SDKs) in CLI commands
- Console output via `rich.console.Console`
- Paths via `pathlib.Path`
- Documentation language: Spanish. Code and comments: English.
- Tests mock external services (Whisper, Ollama, APIs); shared fixtures in `conftest.py`
- CLI tests use `click.testing.CliRunner`
