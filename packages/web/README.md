# Voxnote Web

The Voxnote frontend, built with **TanStack Start** (React 19 + Vite) and deployed
as a **Cloudflare Worker**. All ML still runs in the visitor's browser — the Worker
only serves the app shell and the Ollama CORS proxy; it never receives audio,
transcripts, or API keys.

## How privacy works here

- **Transcription**: Whisper runs in a Web Worker via
  [`@huggingface/transformers`](https://github.com/huggingface/transformers.js)
  (ONNX Runtime Web, WebGPU with WASM fallback). The model is downloaded once
  from the Hugging Face Hub — **not** from Chrome or the Chrome Web Store — at a
  pinned revision (see `MODEL_REVISIONS` in `src/lib/transcriber.worker.ts`),
  cached in the browser, then works offline. Audio never leaves the device.
- **Insights**: the browser calls the user's chosen LLM provider directly with
  the user's own API key (OpenAI / Anthropic / Google / Z.ai / Kimi, Ollama
  Cloud via the same-origin proxy in `src/routes/api/ollama/chat/completions.ts`).
  Only the transcript **text** is sent, and the UI shows an editable transcript
  review step before sending. The **Chrome built-in AI** provider (Gemini Nano)
  is fully local: Chrome downloads/manages that model itself, no key, no
  network (desktop Chrome only).
- **Notes & history**: generated client-side, persisted in IndexedDB.
- **API keys**: stored in this browser only. Settings → "API key storage" can
  switch to session-only (keys vanish when the tab closes) or forget all keys.

Security headers (strict CSP with a per-request nonce, COOP/COEP for
cross-origin isolation) are set by the request middleware in `src/start.ts`;
the same policy is mirrored for static assets in `public/_headers`.

> Limitations: no speaker diarization in the browser (the local Python backend
> offers pyannote). Hosted insights need internet; transcription is offline.

## Run modes

This package is the deployed web product. The Python packages (`packages/core`,
`packages/api`) are an independent local CLI/API and are not called by this
build.

## Development

```bash
npm install
npm run dev        # http://localhost:3001 (Vite + Cloudflare Workers runtime)
npm run build      # vite build + tsc --noEmit → dist/ (client + server)
npm run lint       # eslint
```

## Deploy to Cloudflare Workers

```bash
npm run deploy     # vite build && wrangler deploy -c dist/server/wrangler.json
```

GitHub Actions (`.github/workflows/deploy-web.yml`) does the same on pushes to
`main` that touch `packages/web/`. Required secrets: `CLOUDFLARE_API_TOKEN`
(Workers edit) and `CLOUDFLARE_ACCOUNT_ID`.

Note: this replaces the old Next.js static export on Cloudflare Pages. The
Worker name is `voxnote` (see `wrangler.jsonc`); point the production domain /
route at the Worker when cutting over, and keep the Pages deployment as
rollback until parity is verified.

## How it fits together

```
AudioRecorder / FileUpload
        │  Blob
        ▼
whisper.ts ── blobToFloat32() ── 16 kHz mono PCM
        │  postMessage (transferable)
        ▼
transcriber.worker.ts ── transformers.js ── onnxruntime-web (WebGPU/WASM)
        │  Whisper model from HF Hub @ pinned revision (cached)
        ▼
Editable transcript review (user can redact before anything is sent)
        │
        ▼
insights.ts ── fetch() ──► chosen provider with user's key (or Chrome local AI)
        │
        ▼
exporter.ts ── Markdown note (Obsidian-compatible) ──► notes-db.ts (IndexedDB)
```

## Project structure

```
src/
├── routes/                   # TanStack file routes (ssr: false for app pages)
│   ├── __root.tsx            # shell, nav, theme, service-worker registration
│   ├── index.tsx             # record/upload → transcribe → review → insights → note
│   ├── notes.tsx             # history list + search
│   ├── notes.$filename.tsx   # note detail
│   ├── settings.tsx          # config + on-device model manager
│   └── api/ollama/chat/completions.ts  # hardened Ollama CORS proxy (server)
├── start.ts                  # request middleware: security headers + CSP nonce
├── router.tsx
├── components/               # AudioRecorder, ConfigPanel, ModelManager, …
├── hooks/                    # useVoxnote (pipeline), useConfig, useToast
├── lib/                      # api, whisper, transcriber.worker, insights,
│                             # exporter, docx, notes-db, config-store, capabilities
└── types/
```
