/**
 * Web Worker that runs Whisper speech-to-text in the browser via transformers.js.
 *
 * Keeping the model in a dedicated worker means the heavy ONNX/WebGPU inference never
 * blocks the UI thread (recorder, visualizer, animations). The main thread posts a
 * Float32Array of 16 kHz mono PCM samples plus options; the worker responds with a
 * progress stream (model download) and finally the transcript segments.
 *
 * Model weights are fetched from the Hugging Face Hub the first time and cached by
 * transformers.js (Cache API / IndexedDB), so subsequent runs work fully offline —
 * same pattern as translator.utopiaia.com.
 */

/// <reference lib="webworker" />

import { pipeline, env, type ProgressInfo } from "@huggingface/transformers";

/** Minimal structural type for the ASR pipeline instance we use. */
interface ASRTranscriber {
  (
    audio: Float32Array,
    options: {
      return_timestamps: boolean;
      chunk_length_s: number;
      stride_length_s: number;
      language: string;
      task: "transcribe";
    },
  ): Promise<
    | string
    | {
        text: string;
        chunks?: { timestamp: [number | null, number | null]; text: string }[];
      }
  >;
}

// Pull model weights from the HF Hub. There are no local models bundled with the app.
env.allowLocalModels = false;
env.allowRemoteModels = true;

/** Maps the short label used in the UI to the Hugging Face model id. */
const MODEL_IDS: Record<string, string> = {
  base: "onnx-community/whisper-base",
  small: "onnx-community/whisper-small",
  turbo: "onnx-community/whisper-large-v3-turbo",
  // Moonshine Tiny (27M): English-only, real-time-capable on modest hardware.
  moonshine: "onnx-community/moonshine-tiny-ONNX",
};

/**
 * Pinned Hub revisions (commit SHAs, verified against the HF API). Without a
 * pin, transformers.js would silently download whatever `main` points to on
 * first run — a supply-chain risk for a model that processes private audio.
 * Bump deliberately, after re-validating quality in Spanish.
 */
const MODEL_REVISIONS: Record<string, string> = {
  base: "27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c",
  small: "36050c46d777d46dc4b5f43f6d90574fc38f8732",
  turbo: "360ebcde2559d60bb474678be3c1de9ef347d01a",
  moonshine: "a6da1241cd305dcd64eab1edbd615f2bb9aabb95",
};

/**
 * Per-model ONNX dtype, passed as a STRING so it applies to every weight file
 * (encoder + decoder) uniformly.
 *
 * Why a string and not an object like { encoder: ..., decoder: ... }: transformers.js
 * looks up per-file dtypes by the session key, which for Seq2Seq models (Whisper) is
 * "model" (the encoder) and "decoder_model_merged" — NOT "encoder"/"decoder". Using the
 * wrong keys silently falls through to the device default, which on WebGPU is fp32.
 * fp32 encoder weights exceed the 2 GB single-file ONNX limit, so the model is split
 * into encoder_model.onnx + encoder_model.onnx_data, and onnxruntime-web cannot mount
 * external data ("Module.MountedFiles is not available", microsoft/onnxruntime#19752,
 * closed unfixed). A string dtype avoids the key mismatch entirely.
 *
 * q8 (8-bit quantized → *_quantized.onnx) keeps near-fp32 quality while staying
 * single-file and avoiding the fp16-on-WebGPU precision bug (#1590). Moonshine is tiny
 * (27M) so fp32 single-file is fine.
 */
const MODEL_DTYPES: Record<string, "fp32" | "fp16" | "q8" | "q4"> = {
  base: "q8",
  small: "q8",
  turbo: "q8",
  moonshine: "fp32",
};

/** English-only models that must not receive a `language` option. */
const ENGLISH_ONLY = new Set(["moonshine"]);

export interface TranscribeRequest {
  audio: Float32Array;
  model: string; // base | small | turbo
  language: string; // ISO code, e.g. "es"
}

export interface WorkerProgress {
  type: "progress";
  file: string;
  progress: number; // 0..100
  /** True when this file is being read from the on-device cache, not the network. */
  cached?: boolean;
}

/**
 * Filenames of this model's revision already stored in the transformers
 * cache. transformers.js emits byte-level "progress" events even when it is
 * only reading from the Cache API, which looks exactly like a download; the
 * UI uses this flag to label it honestly ("Loading from this device").
 */
async function cachedFileSet(revision: string): Promise<Set<string>> {
  const found = new Set<string>();
  try {
    if (typeof caches === "undefined") return found;
    const cache = await caches.open("transformers-cache");
    for (const req of await cache.keys()) {
      const marker = `/${revision}/`;
      const i = req.url.indexOf(marker);
      if (i !== -1) found.add(req.url.slice(i + marker.length));
    }
  } catch {
    // cache unavailable — everything will be labelled as a download
  }
  return found;
}

export interface WorkerResult {
  type: "result";
  text: string;
  chunks: { start: number; end: number; text: string }[];
}

export interface WorkerError {
  type: "error";
  message: string;
}

export type WorkerMessage = WorkerProgress | WorkerResult | WorkerError;

// Reuse the pipeline across calls within the same worker lifetime. Keyed by model
// id — the device choice (webgpu with wasm fallback) is stable for a given browser.
type Device = "webgpu" | "wasm";
let cache: { key: string; transcriber: ASRTranscriber; device: Device } | null =
  null;
// Set once WebGPU proves unusable in this browser, so later calls go straight
// to WASM instead of failing the same way every time.
let webgpuBroken = false;

function isGpuError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /gpu|adapter|webgpu|device lost|requestAdapter/i.test(msg);
}

let webgpuUsableCache: boolean | null = null;

/**
 * Preflight the GPU adapter itself. `navigator.gpu` existing is NOT enough:
 * on blocked drivers / headless / VMs, requestAdapter() returns null and
 * onnxruntime-web then fails session creation with "Failed to get GPU
 * adapter" — for the WebGPU session and, in practice, poisons the attempt.
 * Only choose WebGPU when an adapter was actually obtained.
 */
async function webgpuUsable(): Promise<boolean> {
  if (webgpuUsableCache !== null) return webgpuUsableCache;
  try {
    const gpu = (
      navigator as Navigator & {
        gpu?: { requestAdapter: () => Promise<unknown> };
      }
    ).gpu;
    if (!gpu) {
      webgpuUsableCache = false;
      return false;
    }
    webgpuUsableCache = !!(await gpu.requestAdapter());
  } catch {
    webgpuUsableCache = false;
  }
  return webgpuUsableCache;
}

async function getTranscriber(modelKey: string, forceWasm = false) {
  // Strict allowlist: an unknown key is a programming error, not a reason to
  // silently download a different (~1 GB) model than the user picked.
  const modelId = MODEL_IDS[modelKey];
  if (!modelId) throw new Error(`Unknown Whisper model: ${modelKey}`);
  const revision = MODEL_REVISIONS[modelKey];

  // WebGPU is only available in a secure (cross-origin isolated) context. Try
  // it first when a real adapter is obtainable, but fall back to WASM (CPU)
  // if the backend fails — slower, but works everywhere.
  const device: Device =
    !forceWasm && !webgpuBroken && (await webgpuUsable()) ? "webgpu" : "wasm";
  const key = `${modelId}@${revision}|${device}`;
  if (cache?.key === key) return cache;

  // q8 (MatMulNBits-quantized weights) is rejected by the WASM/CPU backend in
  // current onnxruntime-web ("TransposeDQWeightsForMatMulNBits Missing
  // required scale" at session creation, reproduced in headless Chrome).
  // Small models use fp32 on WASM (single-file, fine at this size); Turbo
  // keeps q8 because its fp32 encoder exceeds the 2 GB single-file limit —
  // meaning Turbo effectively requires WebGPU, which the UI should surface.
  const dtype =
    device === "wasm" && modelKey !== "turbo"
      ? "fp32"
      : (MODEL_DTYPES[modelKey] ?? MODEL_DTYPES.turbo);
  const cachedFiles = await cachedFileSet(revision);
  const progress_callback = (info: ProgressInfo) => {
    if (info.status === "progress") {
      const msg: WorkerProgress = {
        type: "progress",
        file: info.file,
        // transformers.js already reports progress in the 0..100 range.
        progress: Math.round(info.progress ?? 0),
        cached: cachedFiles.has(info.file),
      };
      postMessage(msg);
    }
  };

  try {
    const transcriber = (await pipeline("automatic-speech-recognition", modelId, {
      dtype,
      revision,
      device,
      progress_callback,
    })) as unknown as ASRTranscriber;
    cache = { key, transcriber, device };
    return cache;
  } catch (err) {
    if (device === "webgpu" && isGpuError(err)) {
      // Adapter creation can succeed while session creation fails (driver
      // blocklist, headless, …). Retry once on WASM, per the code below.
      console.warn("WebGPU backend unavailable, falling back to WASM:", err);
      webgpuBroken = true;
      return getTranscriber(modelKey, true);
    }
    throw err;
  }
}

self.onmessage = async (e: MessageEvent<TranscribeRequest>) => {
  const { audio, model, language } = e.data;
  try {
    // return_timestamps gives segment-level chunk boundaries, which we map to the
    // Segment shape the rest of the app expects. We run the full audio at once since the
    // worker is already off the main thread (no streaming needed). English-only models
    // (Moonshine) reject the `language` option, so it is omitted for them.
    const opts: Record<string, unknown> = {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      task: "transcribe",
    };
    if (!ENGLISH_ONLY.has(model)) {
      opts.language = language;
    }
    const runOpts = opts as Parameters<ASRTranscriber>[1];

    // The WebGPU failure can surface at inference time, not at pipeline
    // creation (observed in headless/blocked-driver Chrome: "Failed to get
    // GPU adapter" thrown by the first run). Retry once on WASM in that case.
    let output: Awaited<ReturnType<ASRTranscriber>>;
    const first = await getTranscriber(model);
    try {
      output = await first.transcriber(audio, runOpts);
    } catch (err) {
      if (first.device !== "webgpu" || !isGpuError(err)) throw err;
      console.warn("WebGPU inference failed, retrying on WASM:", err);
      webgpuBroken = true;
      cache = null;
      postMessage({
        type: "progress",
        file: "WebGPU unavailable — switching to CPU",
        progress: 0,
      } satisfies WorkerProgress);
      try {
        const fallback = await getTranscriber(model, true);
        output = await fallback.transcriber(audio, runOpts);
      } catch (fallbackErr) {
        const msg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : String(fallbackErr);
        throw new Error(`WASM fallback failed: ${msg}`);
      }
    }

    // transformers.js returns either a string or { text, chunks } depending on options.
    const text = typeof output === "string" ? output : (output.text ?? "");
    const chunks =
      typeof output === "object" && output !== null && Array.isArray(output.chunks)
        ? output.chunks.map((c) => ({
            // chunk timestamps come as [start, end] tuples (seconds)
            start: Array.isArray(c.timestamp) ? (c.timestamp[0] ?? 0) : 0,
            end: Array.isArray(c.timestamp) ? (c.timestamp[1] ?? 0) : 0,
            text: (c.text ?? "").trim(),
          }))
        : [];

    const msg: WorkerResult = { type: "result", text: text.trim(), chunks };
    postMessage(msg);
  } catch (err) {
    const msg: WorkerError = {
      type: "error",
      message: err instanceof Error ? err.message : "Transcription failed",
    };
    postMessage(msg);
  }
};
