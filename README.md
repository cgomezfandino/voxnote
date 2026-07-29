# Voxnote

A local pipeline to record meetings, transcribe them, extract insights, and organize them into Obsidian notes. 100% private — nothing leaves your machine.

**Audio → Whisper → LLM → Obsidian**

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Start services](#start-services)
- [Usage](#usage)
- [CLI](#cli)
- [Web interface](#web-interface)
- [API](#api)
- [Configuration](#configuration)
- [LLM Providers](#llm-providers)
- [Diarization (who said what?)](#diarization-who-said-what)
- [Privacy and legal considerations](#privacy-and-legal-considerations)
- [Obsidian Integration](#obsidian-integration)
- [Architecture](#architecture)
- [Development](#development)

---

## Requirements

- Python ≥ 3.10 (use **Python 3.11** if you plan to enable diarization — whisperX does not support 3.13/3.14)
- Node.js ≥ 18.18 (20+ recommended; required by Next.js 15)
- [FFmpeg](https://ffmpeg.org/) — audio processing
- [Ollama](https://ollama.com/) — local LLM (optional if you use other providers)

### Install FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg
```

### Install Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Download model (4.7 GB)
ollama pull llama3.1:8b
```

---

## Installation

```bash
git clone https://github.com/cgomezfandino/voxnote.git
cd voxnote

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install all packages
make install
```

---

## Start services

### Development (API + Web)

```bash
source .venv/bin/activate
make dev
```

- **API**: http://127.0.0.1:8003
- **Web**: http://localhost:3003

### API only

```bash
make dev-api
```

### Web only

```bash
make dev-web
```

### Ollama (local LLM)

```bash
# Start server
ollama serve

# Verify it is running
curl http://localhost:11434/api/tags
```

---

## Usage

### 1. Team meeting (standup, sprint planning)

```bash
# Record the meeting
voxnote record --duration 900  # 15 minutes

# Process and generate note
voxnote process recordings/20260212_193045.wav
```

### 2. Interview or podcast (with diarization)

```bash
# Transcribe with speaker identification
voxnote process entrevista.mp3 --diarize
```

**Requirement:** install whisperX and configure your token — see [Diarization](#diarization-who-said-what).

### 3. Transcribe only

```bash
voxnote transcribe audio.mp3 > transcript.txt
```

### 4. Process multiple files

```bash
for file in recordings/*.wav; do
    voxnote process "$file"
done
```

---

## CLI

### Full pipeline

```bash
voxnote process <audio> [options]

options:
  -m, --model      Whisper model (default: turbo)
  --diarize        Identify speakers
  --output-dir     Output directory
```

### Record from microphone

```bash
voxnote record [options]

options:
  -o, --output     Path to the .wav file
  -d, --duration   Duration in seconds (omit for manual)
```

### Transcribe only

```bash
voxnote transcribe <audio> [options]

options:
  -m, --model      Whisper model
  --diarize        Identify speakers
```

---

## Web interface

Modern UI at **http://localhost:3003**:

```bash
make dev
```

Features:
- Record audio directly from the browser
- Upload existing files
- Select Whisper model and LLM provider
- View history of generated notes
- Configure speaker diarization
- Note preview with Markdown rendering
- Download notes in **Word (.docx)** or Markdown

---

## API

FastAPI backend at **http://127.0.0.1:8003**

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/transcribe` | Audio upload → transcription |
| POST | `/api/insights` | Transcript → structured insights |
| POST | `/api/export` | Insights → Obsidian .md note |
| GET | `/api/config` | Current configuration |
| PUT | `/api/config` | Update configuration |
| GET | `/api/notes` | List generated notes |
| GET | `/api/notes/{filename}` | Get note content |
| POST | `/api/notes/{filename}/speakers` | Rename SPEAKER_xx tags in a note |
| POST | `/api/export/docx` | Markdown note → Word document (.docx) |
| GET | `/api/ollama/models` | List models installed on the Ollama server |

### Example

```bash
# Transcribe audio
curl -X POST "http://127.0.0.1:8003/api/transcribe" \
  -F "audio=@audio.mp3" \
  -F "model=turbo"

# Extract insights
curl -X POST "http://127.0.0.1:8003/api/insights" \
  -H "Content-Type: application/json" \
  -d '{"text": "...", "provider": "ollama"}'

# Export note
curl -X POST "http://127.0.0.1:8003/api/export" \
  -H "Content-Type: application/json" \
  -d '{"insights": {}, "transcript_text": "...", "audio_name": "reunion.mp3"}'
```

---

## Configuration

Environment variables (`VOXNOTE_` prefix):

| Variable | Default | Description |
|----------|---------|-------------|
| `VOXNOTE_WHISPER_MODEL` | `turbo` | Whisper model |
| `VOXNOTE_LANGUAGE` | `es` | Audio language (empty = auto-detect) |
| `VOXNOTE_LLM_PROVIDER` | `ollama` | LLM provider |
| `VOXNOTE_OLLAMA_MODEL` | `llama3.1:8b` | Ollama model |
| `VOXNOTE_OLLAMA_URL` | `http://localhost:11434` | Ollama URL |
| `VOXNOTE_OUTPUT_DIR` | `output` | Notes directory |
| `VOXNOTE_DIARIZE` | `false` | Enable diarization |
| `VOXNOTE_HF_TOKEN` | | HuggingFace token for diarization |
| `VOXNOTE_DIARIZE_MIN_SPEAKERS` | (auto) | Minimum number of speakers (empty = auto-detection) |
| `VOXNOTE_DIARIZE_MAX_SPEAKERS` | (auto) | Maximum number of speakers (empty = auto-detection) |
| `VOXNOTE_API_HOST` | `127.0.0.1` | API host. There is **no** authentication yet: use `0.0.0.0` only on trusted networks |
| `VOXNOTE_MAX_UPLOAD_MB` | `500` | Maximum audio upload size (API) |
| `VOXNOTE_MAX_JSON_MB` | `10` | Maximum JSON body size (insights/export) |
| `VOXNOTE_API_PORT` | `8003` | API port |
| `VOXNOTE_DIARIZE_MODEL` | `pyannote/speaker-diarization-community-1` | Diarization model (gated) |
| `VOXNOTE_OLLAMA_API_KEY` | (empty) | API key for Ollama cloud/proxy |
| `VOXNOTE_OLLAMA_TIMEOUT` | `120` | Ollama request timeout (s) |
| `VOXNOTE_COMPUTE_TYPE` | `int8` | whisperX compute type (int8/float16/float32) |
| `VOXNOTE_SAMPLE_RATE` | `16000` | Recording sample rate (Hz) |

### .env file

```bash
cp .env.example .env
# Edit .env with your values
```

### Whisper models

| Model | VRAM | Speed | Recommended use |
|--------|------|-----------|-----------------|
| `tiny` | ~1 GB | Very fast | Testing |
| `base` | ~1 GB | Fast | Simple English |
| `small` | ~2 GB | Medium | General use |
| `turbo` | ~6 GB | Fast | **Recommended** |
| `large-v3` | ~10 GB | Slow | Maximum accuracy |

---

## LLM Providers

### Ollama (local, free)

```bash
VOXNOTE_LLM_PROVIDER=ollama
```

> **Your credentials, in your `.env`.** You add the API keys and endpoints for cloud providers **yourself** in `.env` (or environment variables), just like the `VOXNOTE_HF_TOKEN`. The app **never** stores your keys; it only reads them from the environment.

### OpenAI

```bash
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# OPENAI_BASE_URL=https://api.openai.com/v1   # optional: proxy / compatible endpoint
```

Install the extra: `pip install -e "packages/core[openai]"`.

### Google Gemini

```bash
VOXNOTE_LLM_PROVIDER=google
GOOGLE_API_KEY=...            # or GEMINI_API_KEY
GOOGLE_MODEL=gemini-2.0-flash
```

Install the extra: `pip install -e "packages/core[google]"`.

### Anthropic (Claude)

```bash
VOXNOTE_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8   # or claude-sonnet-4-6 / claude-haiku-4-5
# ANTHROPIC_BASE_URL=...          # optional: proxy / gateway
```

Install the extra: `pip install -e "packages/core[anthropic]"`.

See [docs/multi-provider-setup.md](docs/multi-provider-setup.md) for more details.

---

## Diarization (who said what?)

Diarization identifies the different speakers in an audio (`[SPEAKER_00]`, `[SPEAKER_01]`…). With it, the note includes a **Participants** section and attributes decisions, tasks, and comments to each person.

> **It is optional.** Without diarization you still get the summary, key points, insights, and tasks — you only lose the "who said what".

### Enabling it (3 steps)

> ⚠️ **Important:** diarization (whisperX → faster-whisper → ctranslate2) **requires Python 3.11**. **It does not work on Python 3.13/3.14** (there are no ctranslate2/faster-whisper wheels and installation fails). Create the venv with 3.11:
> ```bash
> python3.11 -m venv .venv
> source .venv/bin/activate
> ```

**1. Install the whisperX extra** (not included in the base install):

```bash
.venv/bin/pip install -e "packages/core[whisperx]"
```

**2. Accept the pyannote model on HuggingFace** (it is "gated"; with your account, just once):

- https://huggingface.co/pyannote/speaker-diarization-community-1 → *Agree and access repository*

(`community-1` is the one whisperX 3.8 uses by default and includes all its components —
segmentation, embedding, and PLDA — in a single repo.)

**3. Configure your token** in `.env` — a **valid** token from https://huggingface.co/settings/tokens (type *Read*, or *fine-grained* with "Read access to public gated repos" permission). It starts with `hf_` and is ~37 characters long:

```bash
VOXNOTE_HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> If diarization returns `401 GatedRepoError`, it is almost always the token (invalid, expired, from another account, or without gated-repo permission). Verify it: `curl -H "Authorization: Bearer $TOKEN" https://huggingface.co/api/whoami-v2`.

> The diarization model is configurable via `VOXNOTE_DIARIZE_MODEL` (default `pyannote/speaker-diarization-community-1`, CC-BY license).

### Using it

```bash
voxnote process reunion.mp3 --diarize
```

Or in the web UI, enable the **Diarization** toggle. The number of speakers is **detected automatically** (it works equally well with 2 or 6 people). If you know it, constrain it with `VOXNOTE_DIARIZE_MIN_SPEAKERS` / `VOXNOTE_DIARIZE_MAX_SPEAKERS`.

### Limitations

- Works well with **2-4 people on clean audio**; overlapping voices, noise, or 6+ people degrade accuracy (a limitation of all open models).
- On Mac it runs on **CPU** (MPS is not supported by this stack), so it is slow on long recordings.

> **For distribution:** users of the packaged desktop app **will not need to do any of this** — whisperX and the model will be bundled inside the installer.

---

## Privacy and legal considerations

### Local-first

By default, **the audio, transcriptions, and notes never leave your machine**. There is no central server and no telemetry. You control your data (you can point `VOXNOTE_OUTPUT_DIR` to a folder you sync yourself if you want a backup).

### Recording and consent

Voice is **personal data**. Recording conversations may require **notice or consent** depending on the country/state (one-party or all-party consent laws). Make sure you have permission to record.

### Biometric data

- **Diarization** ("speaker 1 vs 2") is low risk.
- **Voice identification** across meetings (voiceprint — a future feature) would be **special-category biometric data** (GDPR Art. 9, BIPA in Illinois, etc.) and would require **explicit consent** and local storage.

### Licenses

The stack is permissive (Whisper, faster-whisper, pyannote.audio = MIT; whisperX = BSD). See [`NOTICES.md`](NOTICES.md) for attributions. MIT models can be bundled in a desktop app as long as their license notice is included.

> ⚠️ This is general guidance, **not legal advice**. For commercial use, EU users, or biometric features, consult a professional.

---

## Obsidian Integration

The notes include Obsidian-compatible YAML frontmatter:

```yaml
---
tags: [meeting, reunion]
date: 2026-03-02
time: "10:30"
audio: "[[audio/20260302_103000.wav]]"
---
```

### Recommended vault structure

```
MyVault/
├── meetings/     ← VOXNOTE_OUTPUT_DIR points here
├── audio/        ← Original audio files
└── templates/
```

```bash
export VOXNOTE_OUTPUT_DIR=~/MyVault/meetings
```

### Recommended plugins

- **Tasks** — manage action items
- **Dataview** — queries over notes
- **Calendar** — calendar view

### Dataview query for pending action items

```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```

---

## Architecture

### Monorepo Structure

```
Voxnote/
├── packages/
│   ├── core/                    # Python pipeline
│   │   ├── voxnote/
│   │   │   ├── cli.py           # Click CLI
│   │   │   ├── config.py        # Pydantic Settings
│   │   │   └── pipeline/        # models, transcriber, insights, exporter
│   │   │   └── providers/       # ollama, openai, google
│   │   ├── tests/
│   │   └── pyproject.toml
│   ├── api/                     # FastAPI backend
│   │   ├── voxnote_api/
│   │   │   ├── main.py          # App factory + CORS + lifespan
│   │   │   ├── schemas.py       # Pydantic request/response models
│   │   │   └── routes/          # health, transcribe, insights, export, config, notes
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── web/                     # Next.js 15 frontend
│       ├── src/app/             # App Router
│       ├── src/components/      # AudioRecorder, ConfigPanel, etc.
│       ├── src/hooks/           # useVoxnote, useConfig
│       ├── src/lib/api.ts       # Centralized API client
│       └── package.json
├── docs/                        # Documentation
├── recordings/                  # Audio files
├── output/                      # Generated notes
├── Makefile
└── CLAUDE.md
```

### Pipeline Flow

**record → transcribe → extract_insights → export_obsidian**

---

## Development

```bash
# Install dependencies
make install

# Run tests
make test        # all
make test-core   # core only
make test-api    # api only

# Lint and format
make lint        # ruff check + eslint
make format      # ruff format
make typecheck   # mypy packages/core/
```

### Logs

**Dev** and **testing** logs are written to the external SSD so they don't fill up
the local disk and are preserved across sessions:

```
/Volumes/SSDCX9/data/Voxnote/logs/
├── api/       ← API + app loggers (uvicorn, voxnote_api)
├── dev/       ← stdout/stderr captured by `make dev` / `dev-api` / `dev-web`
├── test/      ← pytest sessions (core + api)
└── errors/    ← WARNING+ and uncaught exceptions (tracebacks)
```

Features:

- **Daily rotation**, keeping the last **7 days** (old files are renamed
  automatically and pruned with `make logs-prune`).
- **Dual output**: everything shows in the console **and** is persisted to the SSD,
  so the `make dev` workflow doesn't change.
- **Configurable**: the path is controlled by `VOXNOTE_LOG_DIR` (see `.env.example`).
  If the SSD is not mounted, it gracefully falls back to console-only without breaking anything.

Useful commands:

```bash
make logs        # shows the logs folder and its files
make logs-tail   # tails -f the current dev log
make logs-prune  # deletes logs older than 7 days
```

To point logs to another location, for example on a machine without the SSD:

```bash
make dev LOG_DIR=./logs           # local logs in ./logs
# or set persistently in .env:
#   VOXNOTE_LOG_DIR=/var/log/voxnote
```

### Freeing up disk space

Dependencies (`node_modules`, `.venv`) and caches can take up several GB.
Everything is **regenerable**, so you can delete them at the end of a session to free up space:

```bash
make clean       # deletes caches + node_modules + .next + __pycache__ (~460 MB)
make clean-all   # also removes .venv and venv backups (~2.3 GB more)
```

**You don't need to rebuild anything manually.** The next time you run
any project command (`make dev`, `make test`, `make install`, etc.),
the Makefile detects what's missing and restores it automatically:

- If `.venv` is missing → it creates it with Python 3.11.
- If `node_modules` is missing → it runs `npm install`.
- If Python packages are missing → it installs them with pip.

The first time after a `clean-all` it takes ~1-2 min to restore everything; subsequent
times it's instant.

> Recommended: run `make clean` when closing each work session if you're going
> to be away from the project for a while. Use `make clean-all` if you need to
> free up the maximum possible space.

---

## License

Apache License 2.0 — see [`LICENSE`](LICENSE). For third-party attributions see [`NOTICES.md`](NOTICES.md).
