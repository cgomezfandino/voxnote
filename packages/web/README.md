# Voxnote Web

The Voxnote frontend, built with Next.js 15 + React 19. Runs as a fully static SPA
(`next.config.js` → `output: "export"`).

## Two run modes

This package can work in **two independent ways**:

### 1. Browser-only mode (default, deployable to Cloudflare Pages/Vercel/Netlify)

All processing happens in the visitor's browser — **no backend required**:

- **Transcription**: Whisper runs in a Web Worker via
  [`@huggingface/transformers`](https://github.com/huggingface/transformers.js) (ONNX
  Runtime Web). The model is downloaded once from the Hugging Face Hub and cached, then
  works offline. WebGPU is used when available, with a WASM (CPU) fallback.
- **Insights**: the browser calls the user's chosen LLM provider (OpenAI / Google Gemini
  / Anthropic) **directly**, using an API key the user pastes into Settings (stored in
  `localStorage`, never sent to any server of ours).
- **Notes & history**: generated client-side and persisted in IndexedDB.

This is the same pattern used by sites like
[translator.utopiaia.com](https://translator.utopiaia.com/): load the page, download the
model once, then run offline. Deploy the static build anywhere.

> **Limitations of browser-only mode** (the local Python backend still offers these):
> - No speaker diarization (pyannote is not practical in the browser).
> - Insights require an internet connection (the LLM call). Transcription is offline.

### 2. Local backend mode (Python CLI / packaged desktop)

The Python packages (`packages/core`, `packages/api`) provide whisperX + diarization +
Ollama running on your machine. See the root [`README.md`](../../README.md). The web UI
is not coupled to it anymore — the static build does not call `/api`.

## Getting started (development)

```bash
npm install
npm run dev        # http://localhost:3001
```

The dev server serves the browser-only build — the first transcription will download the
Whisper model (size depends on the model selected in Settings).

## Build

```bash
npm run build      # produces ./out (static export)
```

`out/` is a self-contained static site (HTML + JS + the `_headers` file).

## Deploy to Cloudflare Pages

The app is already configured for static hosting (`output: "export"`,
`images: { unoptimized: true }`) and ships a `public/_headers` that sets the
cross-origin isolation headers onnxruntime-web needs for multi-threaded WASM:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### Option A — Connect the repo (recommended, automatic deploys on push)

1. Push the repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the repo, then under **Build settings**:
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `npm --prefix packages/web run build`
   - **Build output directory**: `packages/web/out`
4. **Save and Deploy**. The `_headers` file is picked up automatically.

### Option B — Wrangler CLI (one-off / manual)

```bash
cd packages/web
npm run build
npx wrangler pages deploy out/ --project-name voxnote
```

## How it fits together (browser-only mode)

```
AudioRecorder (MediaRecorder)
        │  Blob (webm/wav)
        ▼
whisper.ts ── blobToFloat32() ── 16 kHz mono PCM
        │  postMessage (transferable)
        ▼
transcriber.worker.ts ── transformers.js ── onnxruntime-web (WebGPU/WASM)
        │  Whisper model from HF Hub (cached in IndexedDB/Cache API)
        ▼
TranscriptionResult
        │
        ▼
insights.ts ── fetch() ──► OpenAI / Gemini / Anthropic (user's API key)
        │
        ▼
InsightsResult
        │
        ▼
exporter.ts ── Markdown note (Obsidian-compatible)
        │
        ▼
notes-db.ts ── IndexedDB (history)
```

## Project structure

```
src/
├── app/                      # Next.js App Router (single page, client-rendered)
├── components/               # AudioRecorder, ConfigPanel, NotePreview, …
├── hooks/
│   ├── useVoxnote.ts         # pipeline orchestration + model-download progress
│   └── useConfig.ts          # localStorage-backed settings
├── lib/
│   ├── api.ts                # public client surface (used by hooks/components)
│   ├── whisper.ts            # worker wrapper + audio resampling to 16 kHz
│   ├── transcriber.worker.ts # Whisper inference via transformers.js
│   ├── insights.ts           # "bring your own key" LLM calls (prompt = port of providers/base.py)
│   ├── exporter.ts           # Markdown note generator (port of pipeline/exporter.py)
│   ├── docx.ts               # Markdown → .docx in the browser (port of pipeline/docx_exporter.py)
│   ├── notes-db.ts           # IndexedDB persistence for the history tab
│   └── config-store.ts       # localStorage read/patch helpers
└── types/                    # shared TypeScript types
```
