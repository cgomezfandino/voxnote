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
   a Cloudflare Worker at https://voxnote.cgomezfandino.workers.dev. See `packages/web/README.md`.

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
npm run build        # vite build + tsc → dist/
npm run lint         # eslint

# Deploy to Cloudflare Workers
npm run deploy       # vite build && wrangler deploy -c dist/server/wrangler.json

# Test transcription offline (Node script, mirrors the worker pipeline)
# Create a temp script importing @huggingface/transformers (dtypes: src/lib/whisper-catalog.ts)
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
│   │   ├── transcriber.worker.ts   # Whisper inference (transformers.js)
│   │   ├── whisper-catalog.ts      # Model ids, pinned revisions, dtypes (single source)
│   │   ├── llm-proxy.server.ts     # Same-origin relay used by the server routes
│   │   ├── insights.ts             # BYO-key LLM calls (6 providers, structured output)
│   │   ├── exporter.ts             # Markdown note generator
│   │   ├── docx.ts                 # Markdown → .docx in-browser
│   │   ├── notes-db.ts             # IndexedDB persistence + export-all ZIP
│   │   └── config-store.ts         # localStorage read/patch helpers
│   └── types/index.ts              # Shared TypeScript types
├── src/routes/api/{ollama,zai}/chat/completions.ts   # Server routes: CORS relays
├── public/
│   ├── _headers                    # COOP/COEP for crossOriginIsolated
│   └── manifest.webmanifest        # PWA manifest
├── vite.config.ts                  # TanStack Start + Cloudflare Workers
├── wrangler.jsonc                  # Worker config (workers.dev + observability)
├── src/start.ts                    # security headers + CSP nonce middleware
├── src/router.tsx                  # TanStack router (ssr nonce wiring)
└── package.json
```

**Browser pipeline:** `RecordingDraftProvider (MediaRecorder, global) → blobToFloat32 (16 kHz
mono PCM) → transcriber.worker.ts (transformers.js, WebGPU/WASM) → insights.ts (fetch to user's
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

- **Whisper dtype MUST be a string** (`"q4"` for Turbo, `"q8"` for base/small), not an object
  `{ encoder: ... }`. transformers.js
  looks up per-file dtypes by session key (`"model"`, `"decoder_model_merged"`), not by role
  name. Object keys with wrong names silently fall through to fp32 (WebGPU default), which
  loads `encoder_model.onnx_data` (>2 GB split file) and throws `Module.MountedFiles is not
  available` (onnxruntime-web can't mount external data — microsoft/onnxruntime#19752, unfixed).
- **Turbo is q4, not q8** (2026-11-11). Its q8 files (`*_quantized.onnx`) have no WebGPU kernels
  for the quantized MatMuls and run on CPU: slow on speech, and on non-speech audio (silence,
  muted mic) the decoder never finished in >3 min. q4 (`*_q4.onnx`, MatMulNBits) ran the same
  input in ~8 s, ~760 MB. Turbo on WASM is impractically slow — it needs WebGPU.
- **fp16 is avoided** — known precision bug on WebGPU for Whisper encoder (#1590).
- **Distil-Whisper was removed** — q8 quantization returns empty text for non-English; same
  download size as Turbo which works for all languages.
- **Chrome built-in AI (Gemini Nano) is the default insights provider** — keyless and on-device.
  Settings checks availability and points other browsers to a provider. Uses
  `responseConstraint` (structured output) and `expectedInputs/Outputs` for en/es/ja.
- **"Test connection"** in Settings (`testProviderConnection`) sends a few tokens to check
  key + model, lists installed models for local Ollama, and starts the Gemini Nano download
  inside the click (Chrome requires a user gesture). Errors go through
  `explainProviderError` (bad key, unknown model, org blocking browser CORS, rate limit…).
- **Local Ollama (`ollama_local`)** is called directly from the browser — no relay. Only
  loopback is allowed (`normalizeOllamaUrl` + CSP `http://localhost:* http://127.0.0.1:*`); the
  user must set `OLLAMA_ORIGINS=<site origin>`.
- **onnxruntime-web is self-hosted**: the worker sets `env.backends.onnx.wasm.wasmPaths` to the
  Vite-emitted `ort-wasm-simd-threaded.asyncify.{mjs,wasm}` (imported by path — the package's
  `exports` doesn't list them). No CDN in the CSP. The wasm is ~23.5 MB, under the 25 MiB
  Workers asset limit — keep `@huggingface/transformers`/`onnxruntime-web` pinned.
- **Service worker is network-first** for JS/HTML — prevents stale JS after deploys (was a
  recurring problem with precache-only strategy).
- **Ollama Cloud and Z.ai need a relay** — neither sends CORS headers (Z.ai's preflight has
  no `Access-Control-Allow-Origin`). Server routes `/api/{ollama,zai}/chat/completions` forward
  to ONE fixed upstream each with the user's Bearer key (never stored/logged), and reject any
  request whose `Origin` isn't the Worker's own origin (403).
- **OpenAI-compatible providers** (OpenAI, Z.ai, Kimi, Ollama) share `callOpenAICompatible`
  with a baseUrl map. Adding a new one is one line in `OPENAI_COMPATIBLE`. `temperature` is
  omitted for reasoning models (`o*`, `gpt-5*`), which reject it.
- **Anthropic forced `tool_choice` → 400 on Claude Opus/Sonnet 5.5 and Fable**; `callAnthropic`
  retries once with `tool_choice: auto` + an instruction to call the tool.
- **Recording lives in `RecordingDraftProvider`** (above the routes), so it keeps recording on
  Notes/Settings (navbar shows "REC mm:ss"). MediaRecorder emits a chunk every 5 s, appended
  to IndexedDB `recording_chunks` (DB v3); a crash/reload mid-recording is recovered on next
  start. A Web Lock (`voxnote-recording`) stops other tabs from "recovering" a live recording.
  Discard / Re-record / replacing audio always ask for confirmation. Output is WebM/Opus.

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

- **URL:** https://voxnote.cgomezfandino.workers.dev (Cloudflare Worker)
- **Auto-deploy:** GitHub Action `.github/workflows/deploy-web.yml` — on push to `main`
  (when `packages/web/` changes), builds and deploys the Worker with wrangler.
  The old Pages project was deleted 2026-11-04; production is the Worker URL above.
  There is no `functions/` directory anymore (the Ollama proxy is a TanStack route).
- **Manual deploy (fallback):** `cd packages/web && npm run deploy`
- **Required GitHub secrets:** `CLOUDFLARE_API_TOKEN` (Cloudflare Workers: Edit),
  `CLOUDFLARE_ACCOUNT_ID`
- **CI:** `.github/workflows/ci.yml` — Python (ruff + pytest) and Web (eslint + tsc)
- **Roadmap:** `docs/web-roadmap.md` — research on diarization, models, and future features
- **Session handoff:** `docs/session-handoff.md` — state, decisions, and pending work
- **Repo → SSD move:** `docs/migrate-to-ssd.md` — runbook to relocate the checkout onto `/Volumes/SSDCX9`
