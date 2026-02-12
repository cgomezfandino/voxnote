# Voxnote — Agent Instructions

**Voxnote** is a local meeting recording and transcription pipeline: Audio → Whisper → Ollama → Obsidian Markdown. Privacy-first, CLI-driven, Spanish-oriented by default.

---

## Project Overview

Voxnote is a 100% local meeting-notes pipeline. It records audio, transcribes with Whisper (or whisperX for speaker diarization), extracts structured insights via pluggable LLM providers, and exports Obsidian-compatible Markdown notes. No data leaves the machine by default.

**Pipeline flow:** `record → transcribe → extract_insights → export_obsidian`

---

## Build/Test Commands

### Setup
```bash
make dev                    # Install with dev dependencies
pip install -e ".[dev]"    # Alternative direct install
```

### Development
```bash
make lint                   # ruff check src/ tests/
make format                 # ruff format src/ tests/
make typecheck              # mypy src/
make test                   # pytest
make clean                  # Remove build artifacts
```

### Direct Commands
```bash
pytest                           # All tests
pytest tests/test_exporter.py   # Single test file
pytest -k test_name             # Single test by name
pytest -v -k "test_"           # Verbose, matching pattern
pytest --cov=src                # With coverage
```

---

## Code Style Guidelines

### Python (ruff + mypy)
- **Target:** Python 3.10+, line length 100
- **Imports:** stdlib → third-party → local (enforced by ruff)
- **Type hints:** Required on all public functions (`str | Path` union syntax)
- **Docstrings:** Google-style with Args/Returns sections
- **Naming:** `snake_case` (functions/vars), `PascalCase` (classes), `UPPER_CASE` (constants)

### Project Conventions
1. **Lazy imports:** Heavy deps (whisper, torch, whisperx, provider SDKs) imported inside CLI functions to keep CLI startup fast
2. **Console output:** Use `rich.console.Console` instance for terminal formatting
3. **Path handling:** Always use `pathlib.Path`, never strings
4. **Error handling:** Specific exceptions with messages; let CLI exceptions propagate
5. **Configuration:** Add fields to `Settings` in `config.py` using `pydantic.Field(description="...")`
6. **Pipeline modules:** Independent testable functions in `pipeline/` (recorder.py, transcriber.py, insights.py, exporter.py)
7. **Documentation language:** Spanish. Code and comments: English.

### MyPy Strict Mode
All code must pass `mypy src/` with `strict=true`. Use `# type: ignore` only when necessary with comment.

---

## Project Structure

```
src/voxnote/
├── cli.py              # Click commands (voxnote command group: record, transcribe, process)
├── config.py           # Pydantic Settings (env vars prefixed VOXNOTE_, reads .env)
├── ui.py               # Streamlit web UI (voxnote-ui entry point)
├── pipeline/           # Core stages
│   ├── models.py       # TranscriptResult + Segment dataclasses (speaker diarization data)
│   ├── recorder.py     # sounddevice → .wav
│   ├── transcriber.py  # Whisper/whisperX transcription + optional diarization
│   ├── insights.py     # Delegates to providers via get_provider() factory
│   └── exporter.py     # Obsidian Markdown note with YAML frontmatter
└── providers/          # LLM provider implementations
    ├── base.py         # Abstract base class LLMProvider
    ├── __init__.py     # Factory function get_provider()
    ├── ollama.py       # Local Ollama (default) — POST /api/generate, JSON repair
    ├── openai.py       # OpenAI API
    ├── kimi.py         # Moonshot/Kimi API
    ├── glm.py          # Zhipu GLM API
    └── google.py       # Google Gemini API
```

### Key Design Patterns
- **Provider abstraction:** `providers/__init__.py:get_provider()` is a factory that returns an `LLMProvider` by name. All providers implement `extract_insights(transcript) → dict`. Adding a provider means subclassing `LLMProvider` and registering in the factory dict.
- **Transcription result model:** `TranscriptResult` wraps plain text + optional speaker-labeled `Segment` list. The `to_speaker_text()` method merges consecutive same-speaker segments. Both CLI and exporter handle the `TranscriptResult` type.
- **Backend auto-detection:** `transcriber.py` detects whisperX vs openai-whisper at import time. whisperX enables alignment + diarization; vanilla whisper is the fallback.
- **Insights output structure:** All providers return the same JSON dict with keys: `resumen`, `decisiones`, `action_items`, `insights`, `preguntas_abiertas`, `proximos_pasos`. Output language is Spanish.

---

## Testing Strategy

- **Framework:** pytest + pytest-cov
- **Approach:** Mock external services (Whisper, Ollama, APIs); use `tmp_path` fixture
- **CLI tests:** Use `click.testing.CliRunner`
- **Fixtures:** Shared data in `tests/conftest.py` (sample_insights, sample_transcript, sample_diarized_result)

### Key Test Patterns
```python
# CLI test
from click.testing import CliRunner
runner = CliRunner()
result = runner.invoke(main, ["transcribe", "audio.mp3"])

# Mock external API
from unittest.mock import patch, MagicMock
with patch("voxnote.providers.ollama.requests.post") as mock_post:
    mock_post.return_value.json.return_value = {"response": "..."}

# Mock transcription
with patch("voxnote.pipeline.transcriber.transcribe") as mock_t:
    mock_t.return_value = TranscriptResult(text="...")
```

---

## Configuration

All env vars prefixed with `VOXNOTE_`, defined in `config.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Modelo Whisper: tiny/base/small/medium/turbo/large-v3 |
| `VOXNOTE_LANGUAGE` | `es` | Idioma (ISO 639-1) o vacío para auto-detectar |
| `VOXNOTE_LLM_PROVIDER` | `ollama` | Proveedor: ollama/openai/kimi/glm/google |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Modelo Ollama |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | URL servidor Ollama |
| `VOXNOTE_OLLAMA_TIMEOUT` | `120` | Timeout en segundos |
| `VOXNOTE_OUTPUT_DIR` | `output` | Directorio de notas generadas |
| `VOXNOTE_DIARIZE` | `false` | Habilitar diarización (requiere whisperx + HF token) |
| `VOXNOTE_HF_TOKEN` | | Token HuggingFace para modelos pyannote |
| `VOXNOTE_DIARIZE_MIN_SPEAKERS` | `2` | Mínimo de hablantes esperados |
| `VOXNOTE_DIARIZE_MAX_SPEAKERS` | `5` | Máximo de hablantes esperados |
| `VOXNOTE_COMPUTE_TYPE` | `int8` | Tipo de compute para whisperX (int8/float16/float32) |
| `VOXNOTE_SAMPLE_RATE` | `16000` | Sample rate de grabación en Hz |

### Cloud Provider API Keys
These use their own env vars (not VOXNOTE_ prefix):
- `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL`
- `KIMI_API_KEY` / `KIMI_MODEL` (or `MOONSHOT_API_KEY`)
- `GLM_API_KEY` / `GLM_MODEL` / `GLM_BASE_URL` (or `ZHIPUAI_API_KEY`)
- `GOOGLE_API_KEY` / `GOOGLE_MODEL` (or `GEMINI_API_KEY`)

---

## CLI Commands

```bash
# Record audio from microphone
voxnote record                      # Manual stop (Ctrl-C)
voxnote record -d 900               # 15 minutes duration
voxnote record -o meeting.wav       # Custom output path

# Transcribe only
voxnote transcribe audio.mp3
voxnote transcribe audio.mp3 --diarize     # With speaker identification
voxnote transcribe audio.mp3 -m large-v3   # Override model

# Full pipeline: transcribe → insights → export
voxnote process audio.mp3
voxnote process audio.mp3 --diarize -o ./notes

# Web UI
voxnote-ui                          # Launch Streamlit at localhost:8501
```

---

## Pipeline Signatures

```python
# recorder.py
def record_audio(output_path: str | Path, duration: float | None = None) -> Path

# transcriber.py
def transcribe(
    audio_path: str | Path, 
    model_name: str | None = None,
    diarize: bool | None = None
) -> TranscriptResult

# insights.py
def extract_insights(transcript: str, provider_name: str | None = None) -> dict

# exporter.py
def export_obsidian(
    insights: dict, 
    transcript: str | TranscriptResult, 
    audio_name: str,
    output_dir: Path | None = None
) -> Path
```

---

## Security

- No secrets in code; use environment variables (`.env` file, gitignored)
- Never commit: `.env`, `recordings/*.wav`, `output/*.md`, `__pycache__/`
- All processing is local by default (Whisper, Ollama)
- Audio files: gitignored
- Model files: cached locally in `~/.cache/whisper/` (gitignored)
- Provider API keys validated at provider initialization

---

## Optional Dependencies

Install extras via pip:
```bash
pip install -e ".[ui]"          # Streamlit web interface
pip install -e ".[whisperx]"    # whisperX for diarization
pip install -e ".[openai]"      # OpenAI provider
pip install -e ".[kimi]"        # Kimi/Moonshot provider
pip install -e ".[glm]"         # GLM/Zhipu provider
pip install -e ".[google]"      # Google Gemini provider
pip install -e ".[all-providers]"  # All cloud providers
```

---

## External Dependencies

- **FFmpeg:** Required by Whisper for audio processing
  ```bash
  brew install ffmpeg          # macOS
  sudo apt install ffmpeg      # Ubuntu/Debian
  ```
- **Ollama:** Required for default LLM provider
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ollama pull llama3.1:8b
  ```

---

## References

- `pyproject.toml` — Full ruff/mypy/pytest config and project metadata
- `Makefile` — Build automation
- `.env.example` — Complete configuration template
- `README.md` — User documentation (Spanish)
- `CLAUDE.md` — Additional context for Claude Code
