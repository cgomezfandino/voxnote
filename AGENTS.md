# Voxnote — Agent Instructions

This document guides AI coding agents working on the Voxnote repository.

---

## Project Overview

**Voxnote** is a 100% local meeting recording and transcription pipeline. It captures audio, transcribes with OpenAI Whisper, extracts structured insights via Ollama (local LLM), and exports Obsidian-compatible Markdown notes. No data leaves the machine.

**Pipeline Flow:**
```
Audio → Whisper (transcription) → Ollama (insights extraction) → Obsidian (Markdown note)
```

**Key Characteristics:**
- Privacy-first: All processing happens locally
- Spanish-oriented: Default language is Spanish (`es`), insights extracted in Spanish
- Obsidian integration: Generates Markdown with YAML frontmatter compatible with Obsidian
- CLI-driven: Click-based command-line interface

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Language | Python ≥3.10 | Core runtime |
| Transcription | OpenAI Whisper | Local speech-to-text |
| LLM | Ollama (llama3.1:8b) | Insight extraction |
| CLI | Click | Command-line interface |
| Config | Pydantic Settings | Environment-based configuration |
| Output | Rich | Console formatting |
| Audio I/O | sounddevice + soundfile | Microphone recording |
| Testing | pytest + pytest-cov | Unit tests with coverage |
| Linting | ruff | Code formatting and linting |
| Types | mypy | Static type checking |
| Build | setuptools + Makefile | Package building |

---

## Project Structure

```
Voxnote/
├── src/voxnote/               # Source code
│   ├── __init__.py           # Package init with version
│   ├── cli.py                # Click CLI entry point (voxnote command)
│   ├── config.py             # Pydantic settings (env vars with VOXNOTE_ prefix)
│   └── pipeline/             # Pipeline stages
│       ├── __init__.py       # Pipeline exports
│       ├── recorder.py       # Microphone capture via sounddevice → .wav
│       ├── transcriber.py    # Whisper model loading + transcription
│       ├── insights.py       # Ollama API call, JSON prompt, response parsing
│       └── exporter.py       # Obsidian Markdown note generation
├── tests/                     # Test files
│   ├── conftest.py           # Shared pytest fixtures
│   ├── test_cli.py           # CLI command tests
│   ├── test_config.py        # Configuration tests
│   ├── test_transcriber.py   # Transcription tests (mocked)
│   ├── test_insights.py      # Insight extraction tests (mocked)
│   └── test_exporter.py      # Markdown export tests
├── docs/                      # Documentation
│   ├── meeting-pipeline-guide.md  # Complete setup guide (Spanish)
│   └── guia-de-uso.md        # User guide (Spanish)
├── recordings/               # Audio recordings (gitignored)
├── output/                   # Generated Markdown notes (gitignored)
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot guidelines
├── pyproject.toml            # Python project configuration
├── Makefile                  # Build automation
├── .env.example              # Environment variables template
├── README.md                 # Project documentation (Spanish)
├── CLAUDE.md                 # Claude Code specific guidelines
└── AGENTS.md                 # This file
```

---

## Build and Test Commands

### Setup

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux

# Install in development mode
make dev
# OR: pip install -e ".[dev]"
```

### Development Commands (via Makefile)

| Task | Command | Description |
|------|---------|-------------|
| Install | `make install` | Install package (editable) |
| Dev install | `make dev` | Install with dev dependencies |
| Lint | `make lint` | Run ruff linter on src/ tests/ |
| Format | `make format` | Run ruff formatter on src/ tests/ |
| Test | `make test` | Run pytest |
| Type check | `make typecheck` | Run mypy on src/ |
| Clean | `make clean` | Remove build artifacts and caches |

### Direct Commands

```bash
# Run tests
pytest                           # All tests
pytest tests/test_exporter.py   # Single test file
pytest -k test_name             # Single test by name

# Lint and format
ruff check src/ tests/
ruff format src/ tests/

# Type check
mypy src/
```

---

## CLI Usage

The `voxnote` command provides three main subcommands:

```bash
# Record audio from microphone
voxnote record                           # Manual stop (Ctrl-C)
voxnote record --duration 60            # Fixed duration (seconds)
voxnote record -o custom/path.wav       # Custom output path

# Transcribe only
voxnote transcribe audio.mp3
voxnote transcribe audio.mp3 --model large-v3

# Full pipeline: transcribe → insights → Markdown note
voxnote process audio.mp3
voxnote process audio.mp3 --model large-v3 --output-dir ~/Notes
```

---

## Configuration

Configuration is managed via `voxnote.config.Settings` using Pydantic Settings. All environment variables use the `VOXNOTE_` prefix.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Whisper model: tiny/base/small/medium/turbo/large-v3 |
| `VOXNOTE_LANGUAGE` | `es` | Audio language (ISO 639-1). Empty = auto-detect |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Ollama model for insight extraction |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `VOXNOTE_OLLAMA_TIMEOUT` | `120` | Ollama request timeout (seconds) |
| `VOXNOTE_SAMPLE_RATE` | `16000` | Audio sample rate for recording (Hz) |
| `VOXNOTE_OUTPUT_DIR` | `output` | Directory for generated notes |

### Configuration File

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

---

## Code Style Guidelines

### Python Style

- **Formatter:** ruff (line length: 100)
- **Target Python:** 3.10+
- **Import order:** stdlib → third-party → local (enforced by ruff)
- **Type hints:** Required on all public functions
- **Docstrings:** Google-style docstrings for all public functions
- **Naming:**
  - `snake_case` for functions and variables
  - `PascalCase` for classes
  - `UPPER_CASE` for constants

### Ruff Configuration (from pyproject.toml)

```toml
[tool.ruff]
target-version = "py310"
line-length = 100
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
```

### MyPy Configuration

```toml
[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
```

### Project-Specific Conventions

1. **Lazy imports:** Heavy dependencies (whisper, torch) are imported inside CLI commands to keep startup fast
2. **Console output:** Use `rich.console.Console` for formatted terminal output
3. **Audio handling:** All audio I/O through `sounddevice` (input) and `soundfile` (output)
4. **Error handling:** Let exceptions propagate for CLI commands; Rich will format tracebacks nicely
5. **Path handling:** Use `pathlib.Path` for all file paths

---

## Testing Strategy

### Test Structure

- Tests are in `tests/` directory mirroring the source structure
- Use `pytest` as the test runner
- Use `pytest-cov` for coverage reporting

### Testing Approach

1. **Unit tests with mocking:** External services (Whisper, Ollama API) are mocked
2. **Fixtures:** Shared test data in `conftest.py` (`sample_insights`, `sample_transcript`)
3. **CLI tests:** Use `click.testing.CliRunner` for CLI command tests
4. **Temporary files:** Use `tmp_path` fixture for file output tests

### Key Fixtures (from conftest.py)

```python
sample_insights  # Realistic insights dict with all expected keys
sample_transcript  # Sample Spanish transcript text
```

### Running Tests

```bash
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest --cov=src          # With coverage
pytest --cov=src --cov-report=html  # HTML coverage report
```

---

## Pipeline Architecture

The core functionality is organized as a 4-stage pipeline:

### 1. Recorder (`pipeline/recorder.py`)

```python
def record_audio(output_path: str | Path, duration: float | None = None) -> Path
```

- Records from default microphone using `sounddevice`
- Supports fixed duration or manual stop (Ctrl-C)
- Saves as WAV file via `soundfile`
- Returns the Path to saved file

### 2. Transcriber (`pipeline/transcriber.py`)

```python
def transcribe(audio_path: str | Path, model_name: str | None = None) -> str
```

- Loads Whisper model (cached after first download)
- Transcribes audio file to text
- Respects `VOXNOTE_LANGUAGE` setting (or auto-detect if empty)
- Returns full transcription text

### 3. Insights (`pipeline/insights.py`)

```python
def extract_insights(transcript: str) -> dict
```

- Sends transcript to Ollama API (`/api/generate`)
- Uses structured JSON prompt for consistent output
- Extracts: resumen, decisiones, action_items, insights, preguntas_abiertas, proximos_pasos
- Truncates transcripts > 4000 chars
- Strips markdown fences from LLM response
- Returns parsed dict

### 4. Exporter (`pipeline/exporter.py`)

```python
def export_obsidian(insights: dict, transcript: str, audio_name: str, output_dir: Path | None = None) -> Path
```

- Generates Obsidian-compatible Markdown
- Includes YAML frontmatter (tags, date, time, audio link)
- Formats action items as checkboxes with assignees and deadlines
- Saves to `VOXNOTE_OUTPUT_DIR` with date-stamped filename
- Returns path to generated file

---

## External Dependencies

### Required System Dependencies

1. **FFmpeg** — Required by Whisper for audio decoding
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`

2. **Ollama** — Local LLM server
   - Install from https://ollama.com
   - Default model: `llama3.1:8b` (~4.7 GB)
   - Must be running on `localhost:11434`

### Whisper Models

Models are downloaded automatically on first use to `~/.cache/whisper/`:

| Model | Size | Speed | Use Case |
|-------|------|-------|----------|
| tiny | ~1 GB | Very fast | Testing only |
| base | ~1 GB | Fast | English audio |
| small | ~2 GB | Medium | Good balance |
| medium | ~5 GB | Slow | Spanish (minimum recommended) |
| turbo | ~6 GB | Fast | **Recommended** — speed of small, quality of large |
| large-v3 | ~10 GB | Very slow | Maximum accuracy |

---

## Security Considerations

1. **No data leaves the machine:** All processing (Whisper, Ollama) is local
2. **Environment variables:** Use `.env` for configuration (gitignored)
3. **No secrets in code:** API keys (if any) should use environment variables
4. **Audio files:** Never commit audio files (gitignored)
5. **Model files:** Whisper `.pt` files are cached locally (gitignored)
6. **Output files:** Generated notes and transcripts are gitignored

---

## Obsidian Integration

Generated notes are optimized for Obsidian:

- **YAML frontmatter** with tags, date, time, audio link
- **WikiLinks** for audio references: `[[audio/filename.wav]]`
- **Task checkboxes** for action items: `- [ ] Task @assignee (deadline: date)`
- **Compatible plugins:**
  - **Tasks** — Manage action items
  - **Dataview** — Query meetings (e.g., pending tasks)
  - **Calendar** — Calendar view of meetings

### Example Dataview Query

```markdown
```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```
```

---

## Language and Localization

- **Primary documentation language:** Spanish
- **Code and comments:** English
- **Default audio language:** Spanish (`es`)
- **LLM output language:** Spanish

---

## Common Development Tasks

### Adding a New CLI Command

1. Add command function in `src/voxnote/cli.py` using `@main.command()`
2. Use Click decorators for options/arguments
3. Import pipeline modules inside the command (lazy loading)
4. Add test in `tests/test_cli.py`

### Adding a New Configuration Option

1. Add field to `Settings` class in `src/voxnote/config.py`
2. Use `Field()` with description
3. Add test in `tests/test_config.py`
4. Document in `.env.example`

### Modifying Pipeline Stages

1. Each stage is independent and testable
2. Maintain the function signature for backward compatibility
3. Update tests with mocked dependencies
4. Update docstrings with Google-style format

---

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| "No module named whisper" | Run `pip install -e ".[dev]"` |
| "ffmpeg not found" | Install FFmpeg (system dependency) |
| "Connection refused" to Ollama | Start Ollama: `ollama serve` |
| Microphone not accessible | Grant microphone permission to terminal in System Preferences |
| Whisper model slow first time | Normal — model is downloading (~6 GB for turbo) |
| Ollama returns invalid JSON | Retry — LLM output can vary; use larger model if persistent |

---

## References

- `README.md` — Project overview and quick start (Spanish)
- `CLAUDE.md` — Claude Code specific guidelines
- `docs/guia-de-uso.md` — Detailed user guide (Spanish)
- `docs/meeting-pipeline-guide.md` — Complete setup guide (Spanish)
- `.github/copilot-instructions.md` — GitHub Copilot guidelines
- `pyproject.toml` — Full project configuration
- `.env.example` — Configuration template
