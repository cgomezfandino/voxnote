# Usage Guide — Voxnote

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Start services](#3-start-services)
4. [Record a meeting](#4-record-a-meeting)
5. [Process an existing audio file](#5-process-an-existing-audio-file)
6. [Transcribe only](#6-transcribe-only)
7. [Web interface](#7-web-interface)
8. [Configure Obsidian](#8-configure-obsidian)
9. [Advanced configuration](#9-advanced-configuration)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### FFmpeg

Whisper needs FFmpeg to decode audio in any format.

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Verify
ffmpeg -version
```

### Ollama

Ollama runs the LLM locally to extract insights from transcriptions.

```bash
# macOS — download from https://ollama.com or:
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Download the model (only once, ~4.7 GB)
ollama pull llama3.1:8b

# Verify it works
ollama run llama3.1:8b "Say hello"
```

> Ollama must be running before using `voxnote process`. On macOS, it starts as a service automatically when installed. On Linux: `ollama serve &`

### Python ≥ 3.10 and Node.js ≥ 18

```bash
python3 --version  # must be 3.10+
node --version     # must be 18+
```

---

## 2. Installation

```bash
# Clone the repo
git clone https://github.com/cgomezfandino/Voxnote.git
cd Voxnote

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install all packages (core + api + web)
make install

# Verify CLI
voxnote --help
```

The first time you use Whisper, the model is downloaded automatically (~6 GB for `turbo`). This only happens once.

---

## 3. Start services

### Full development (API + Web)

```bash
source .venv/bin/activate
make dev
```

This starts:
- **API** at http://127.0.0.1:8003
- **Web** at http://localhost:3003

### API only

```bash
make dev-api
```

### Web only

```bash
make dev-web
```

### Verify everything works

```bash
# 1. FFmpeg installed
ffmpeg -version

# 2. Ollama running
curl -s http://localhost:11434/api/tags | python3 -m json.tool

# 3. API active
curl http://127.0.0.1:8003/api/health

# 4. Microphone accessible (records a 3-second test)
voxnote record --duration 3
```

If step 4 works, you're ready. The audio was saved in `recordings/`.

---

## 4. Record a meeting

### Manual recording (stop with Ctrl-C)

```bash
voxnote record
```

This saves a `.wav` file in `recordings/` named with a timestamp.

### Fixed-duration recording

```bash
# 30 minutes = 1800 seconds
voxnote record --duration 1800
```

### Save to a specific path

```bash
voxnote record -o audio/standup_2026-03-02.wav
```

### Record and process in a single step

```bash
voxnote record -o audio/meeting.wav
voxnote process audio/meeting.wav
```

---

## 5. Process an existing audio file

The `process` command runs the full pipeline:

```
Audio → Whisper (transcription) → Ollama (insights) → Markdown note
```

```bash
# Use default model (turbo)
voxnote process audio/my_meeting.mp3

# Use a more accurate model (requires ~10 GB VRAM)
voxnote process audio/my_meeting.mp3 --model large-v3

# Save note to a specific directory
voxnote process audio/my_meeting.mp3 --output-dir ~/MeetingNotes/meetings
```

### What it generates

A Markdown file in `output/` (or the directory you specify) containing:

- **YAML frontmatter** — tags, date, time, link to audio
- **Executive summary** — 3-5 sentences
- **Decisions made**
- **Action Items** — with checkboxes, owner and deadline
- **Key insights**
- **Open questions**
- **Next steps**
- **Full transcript** at the end

Example filename: `2026-03-02_standup.md`

---

## 6. Transcribe only

If you only need the text without insight analysis:

```bash
voxnote transcribe audio/my_meeting.mp3

# With a specific model
voxnote transcribe audio/my_meeting.mp3 --model medium
```

The transcription is printed to the terminal. You can redirect it to a file:

```bash
voxnote transcribe audio/my_meeting.mp3 > transcription.txt
```

---

## 7. Web interface

A modern UI is available at **http://localhost:3003**:

```bash
make dev
```

Features:
- Record audio directly from the browser
- Upload existing files
- Select Whisper model and LLM provider
- View history of generated notes
- Configure speaker diarization
- Obsidian-style note preview

---

## 8. Configure Obsidian

### Recommended vault structure

Point `VOXNOTE_OUTPUT_DIR` to the `meetings/` directory inside your vault:

```
MyVault/             ← Your Obsidian vault
├── meetings/        ← VOXNOTE_OUTPUT_DIR points here
├── audio/           ← Original audio files
└── templates/
```

```bash
export VOXNOTE_OUTPUT_DIR=~/MyVault/meetings
```

### Recommended plugins

Install them from **Settings → Community Plugins → Browse**:

| Plugin | What it's for |
|--------|---------------|
| **Tasks** | Manage action items with checkboxes |
| **Dataview** | Queries over your notes (filter by date, tags) |
| **Templater** | Templates with dynamic variables |
| **Calendar** | Calendar view of meetings |

### Useful Dataview queries

**All pending action items:**

````markdown
```dataview
TASK FROM "meetings" WHERE !completed
SORT date DESC
```
````

**This week's meetings:**

````markdown
```dataview
TABLE date, time
FROM "meetings"
WHERE date >= date(today) - dur(7 days)
SORT date DESC
```
````

---

## 9. Advanced configuration

### Environment variables

Create a `.env` file at the project root, or export them in your shell:

```bash
# Whisper model (tiny|base|small|medium|turbo|large-v3)
export VOXNOTE_WHISPER_MODEL=turbo

# Audio language (empty = auto-detect)
export VOXNOTE_LANGUAGE=es

# LLM provider (ollama|openai|google)
export VOXNOTE_LLM_PROVIDER=ollama

# Ollama model for insights
export VOXNOTE_OLLAMA_MODEL=llama3.1:8b

# Ollama server URL
export VOXNOTE_OLLAMA_URL=http://localhost:11434

# Output directory for notes
export VOXNOTE_OUTPUT_DIR=output

# Diarization (identify speakers)
export VOXNOTE_DIARIZE=false
export VOXNOTE_HF_TOKEN=your_huggingface_token
```

### Choosing a Whisper model

| Model | VRAM | Speed | When to use |
|--------|------|-----------|---------------|
| `tiny` | ~1 GB | Very fast | Quick tests |
| `base` | ~1 GB | Fast | Clear English audio |
| `small` | ~2 GB | Medium | Good balance |
| `medium` | ~5 GB | Slow | Spanish meetings — minimum recommended |
| `turbo` | ~6 GB | Fast | **Recommended** — speed of small, quality of large |
| `large-v3` | ~10 GB | Very slow | Maximum accuracy |

> On Apple Silicon (M1/M2/M3/M4), Whisper uses the GPU automatically.

### Bilingual meetings (ES/EN)

If your meetings mix Spanish and English:

```bash
export VOXNOTE_LANGUAGE=
```

Leaving the language empty enables Whisper's auto-detection. Use at least `medium` or `turbo` for good results.

### Change the LLM provider

```bash
# OpenAI
VOXNOTE_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Google Gemini
VOXNOTE_LLM_PROVIDER=google
GOOGLE_API_KEY=...
```

See [multi-provider-setup.md](multi-provider-setup.md) for more details.

---

## 10. Troubleshooting

### "ffmpeg not found"

Whisper requires FFmpeg to decode audio. Install it with your package manager (see [Prerequisites](#1-prerequisites)).

### "Connection refused" when extracting insights

Ollama is not running. Start it:

```bash
# macOS — should be running as a service. If not:
ollama serve

# Linux
ollama serve &
```

Verify: `curl http://localhost:11434/api/tags`

### API not responding

Check that the server is running:

```bash
curl http://127.0.0.1:8003/api/health
```

If it doesn't respond, start the server:

```bash
source .venv/bin/activate
make dev-api
```

### Low-quality transcription

- Upgrade the model: `--model medium` or `--model large-v3`
- Make sure you specify the correct language in `VOXNOTE_LANGUAGE`
- Audio with a lot of background noise reduces quality — use a dedicated microphone

### "Cannot access the microphone"

On macOS, go to **System Preferences → Privacy & Security → Microphone** and make sure your terminal (Terminal.app, iTerm2, VS Code) has permission.

### The Whisper model takes a long time to load the first time

This is normal. Whisper downloads the model (~6 GB for `turbo`) the first time. It is saved in `~/.cache/whisper/` and subsequent runs are fast.

### Ollama returns invalid JSON

Sometimes the LLM doesn't generate clean JSON. If this happens frequently:
- Use a larger model: `llama3.1:70b`
- Re-run the command — the low temperature (0.1) minimizes variability
