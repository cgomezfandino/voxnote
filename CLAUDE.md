# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voxnote is a **dual-mode** meeting-notes app. It records audio, transcribes with Whisper,
extracts structured insights via pluggable LLM providers, and exports Obsidian-compatible
Markdown notes.

There are **two independent run modes**:

1. **Web (browser-only, deployed)** — `packages/web`. A static SPA (Next.js 15 export) that
   runs **entirely in the browser**: Whisper via transformers.js (WebGPU/WASM), insights via
   direct calls to the user's own LLM API key, notes in IndexedDB. No backend. Deployed to
   Cloudflare Pages at https://voxnote.pages.dev. See `packages/web/README.md`.

2. **Python CLI / local API** — `packages/core` + `packages/api`. The original local-first
   pipeline: whisperX (with speaker diarization via pyannote) + Ollama/cloud LLMs, served
   over FastAPI. For local/desktop use only. The web build does **not** call this backend.

The monorepo has three packages:
- `packages/core` — Python pipeline (CLI, transcription, insights, export)
- `packages/api` — FastAPI backend (for local mode only)
- `packages/web` — Next.js 15 frontend (**browser-only**, the deployed product)

## Commands

### Web (the deployed product)

```bash
cd packages/web
npm install
npm run dev          # dev server on :3001 (browser-only, no backend needed)
npm run build        # static export → out/
npm run lint         # eslint

# Deploy to Cloudflare Pages
npm run build && npx wrangler pages deploy out/ --project-name voxnote --branch main

# Test transcription offline (Node script, mirrors the worker pipeline)
# Create a temp script importing @huggingface/transformers, dtype "q8"
```

### Python (local CLI / API)

```bash
# Install everything
make install

# Run dev servers (API on :8003, Web on :3003)
make dev

# Run individual servers
make dev-api    # uvicorn on port 8003 with --reload
make dev-web    # next dev on port 3003

# Tests
make test       # all tests (core + api)
make test-core  # packages/core tests
make test-api   # packages/api tests

# Lint & format
make lint       # ruff check + eslint
make format     # ruff format
make typecheck  # mypy packages/core/

# CLI
voxnote record
voxnote transcribe audio.mp3
voxnote process audio.mp3
```

## Architecture

### Web (browser-only) — the deployed product

```
packages/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, SW registration, manifest
│   │   ├── page.tsx                # Main SPA (Record / Process / History tabs)
│   │   └── sw.ts                   # Service worker (Serwist, network-first)
│   ├── components/                 # AudioRecorder, ConfigPanel, NotePreview, etc.
│   ├── hooks/
│   │   ├── useVoxnote.ts           # Pipeline orchestration + model-download progress
│   │   └── useConfig.ts            # localStorage-backed settings
│   ├── lib/
│   │   ├── api.ts                  # Public client surface (used by hooks/components)
│   │   ├── whisper.ts              # Worker wrapper + audio resampling to 16 kHz
│   │   ├── transcriber.worker.ts   # Whisper inference (transformers.js, q8 dtype)
│   │   ├── insights.ts             # BYO-key LLM calls (6 providers, structured output)
│   │   ├── exporter.ts             # Markdown note generator
│   │   ├── docx.ts                 # Markdown → .docx in-browser
│   │   ├── notes-db.ts             # IndexedDB persistence + export-all ZIP
│   │   └── config-store.ts         # localStorage read/patch helpers
│   └── types/index.ts              # Shared TypeScript types
├── functions/api/ollama/chat/completions.ts  # Cloudflare Pages Function (Ollama CORS proxy)
├── public/
│   ├── _headers                    # COOP/COEP for crossOriginIsolated
│   └── manifest.webmanifest        # PWA manifest
├── next.config.js                  # output: "export" + Serwist
└── package.json
```

**Browser pipeline:** `AudioRecorder (MediaRecorder) → blobToFloat32 (16 kHz mono PCM) →
transcriber.worker.ts (transformers.js, q8, WebGPU/WASM) → insights.ts (fetch to user's
LLM) → exporter.ts (Markdown) → notes-db.ts (IndexedDB)`.

### Python (local CLI) — for reference

```
packages/core/voxnote/
├── cli.py           # Click CLI
├── config.py        # Pydantic Settings
├── pipeline/        # models, transcriber, insights, exporter
└── providers/       # ollama, openai, google, anthropic

packages/api/voxnote_api/
├── main.py          # App factory + CORS + lifespan
├── schemas.py       # Pydantic request/response models
└── routes/          # health, transcribe, insights, export, config, notes
```

**Python pipeline:** `record → transcribe (whisperX/openai-whisper) → extract_insights → export_obsidian`

## Key technical decisions (web mode)

- **Whisper dtype MUST be a string `"q8"`**, not an object `{ encoder: ... }`. transformers.js
  looks up per-file dtypes by session key (`"model"`, `"decoder_model_merged"`), not by role
  name. Object keys with wrong names silently fall through to fp32 (WebGPU default), which
  loads `encoder_model.onnx_data` (>2 GB split file) and throws `Module.MountedFiles is not
  available` (onnxruntime-web can't mount external data — microsoft/onnxruntime#19752, unfixed).
- **fp16 is avoided** — known precision bug on WebGPU for Whisper encoder (#1590).
- **Distil-Whisper was removed** — q8 quantization returns empty text for non-English; same
  download size as Turbo which works for all languages.
- **Service worker is network-first** for JS/HTML — prevents stale JS after deploys (was a
  recurring problem with precache-only strategy).
- **Ollama Cloud needs a proxy** — CORS-blocked; routed through a Cloudflare Pages Function
  at `/api/ollama/chat/completions` that forwards with the user's Bearer key (never stored).
- **OpenAI-compatible providers** (OpenAI, Z.ai, Kimi, Ollama) share `callOpenAICompatible`
  with a baseUrl map. Adding a new one is one line in `OPENAI_COMPATIBLE`.
- **AudioRecorder produces WebM**, not WAV, despite the `.wav` label — `decodeAudioData`
  handles it transparently.

## Configuration

### Web (localStorage, no env vars)

Settings are stored in `localStorage` under `voxnote:config`. See `src/lib/config-store.ts`
for `DEFAULT_CONFIG`. LLM API keys are per-provider (`api_key_openai`, `api_key_ollama`, etc.).

### Python (env vars with `VOXNOTE_` prefix)

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

## Conventions

- Formatting: `ruff format` (Python), ESLint (TypeScript) — line length 100
- Type hints on all public functions; `mypy --strict` for Python, `strict: true` for TypeScript
- Lazy imports for heavy deps in CLI commands
- Documentation language: Spanish. Code and comments: English.
- React components use `"use client"` directive for client-side interactivity
- Web client surface centralized in `src/lib/api.ts` (same function signatures regardless of
  whether the operation is browser-local or calls a provider)

## Deployed

- **URL:** https://voxnote.pages.dev (Cloudflare Pages, `main` branch)
- **Auto-deploy:** GitHub Action `.github/workflows/deploy-web.yml` — on push to `main`
  (when `packages/web/` or `functions/` change), builds and deploys with wrangler (which
  correctly bundles the Pages Function at repo root). Cloudflare's built-in Git integration
  is **disabled** (it doesn't detect functions in a monorepo).
- **Manual deploy (fallback):** `wrangler pages deploy packages/web/out --project-name voxnote --branch main` (from repo root, so wrangler finds `functions/`)
- **Required GitHub secrets:** `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit),
  `CLOUDFLARE_ACCOUNT_ID`
- **CI:** `.github/workflows/ci.yml` — Python (ruff + pytest) and Web (eslint + tsc)
- **Roadmap:** `docs/web-roadmap.md` — research on diarization, models, and future features
- **Session handoff:** `docs/session-handoff.md` — state, decisions, and pending work
