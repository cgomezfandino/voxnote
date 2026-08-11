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
  // Distil-Whisper Large v3.5: same architecture family as turbo, ~1.5x faster and
  // ~49% smaller with parity-or-better WER. Multilingual.
  distil: "onnx-community/distil-large-v3.5-ONNX",
  // Moonshine Tiny (27M): English-only, real-time-capable on modest hardware.
  moonshine: "onnx-community/moonshine-tiny-ONNX",
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
  distil: "q8",
  moonshine: "fp32",
};

/** English-only models that must not receive a `language` option. Distil-Whisper's q8
 *  quantization breaks non-English transcription (returns empty text), so it is treated
 *  as English-only alongside Moonshine. */
const ENGLISH_ONLY = new Set(["moonshine", "distil"]);

export interface TranscribeRequest {
  audio: Float32Array;
  model: string; // base | small | turbo
  language: string; // ISO code, e.g. "es"
}

export interface WorkerProgress {
  type: "progress";
  file: string;
  progress: number; // 0..100
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

// Reuse the pipeline across calls within the same worker lifetime. Keyed by model id
// + device, so switching models rebuilds only when actually needed.
let cache: { key: string; transcriber: ASRTranscriber } | null = null;

async function getTranscriber(modelKey: string, useWebGPU: boolean) {
  const modelId = MODEL_IDS[modelKey] ?? MODEL_IDS.turbo;
  const device = useWebGPU ? "webgpu" : "wasm";
  const key = `${modelId}|${device}`;
  if (cache?.key === key) return cache.transcriber;

  const dtype = MODEL_DTYPES[modelKey] ?? MODEL_DTYPES.turbo;
  const progress_callback = (info: ProgressInfo) => {
    if (info.status === "progress") {
      const msg: WorkerProgress = {
        type: "progress",
        file: info.file,
        // transformers.js already reports progress in the 0..100 range.
        progress: Math.round(info.progress ?? 0),
      };
      postMessage(msg);
    }
  };

  const transcriber = (await pipeline("automatic-speech-recognition", modelId, {
    dtype,
    device,
    progress_callback,
  })) as unknown as ASRTranscriber;

  cache = { key, transcriber };
  return transcriber;
}

self.onmessage = async (e: MessageEvent<TranscribeRequest>) => {
  const { audio, model, language } = e.data;
  try {
    // WebGPU is only available in a secure (cross-origin isolated) context. Fall back to
    // WASM (CPU) otherwise — slower, but works everywhere.
    const useWebGPU = typeof (navigator as Navigator & { gpu?: unknown }).gpu !== "undefined";
    const transcriber = await getTranscriber(model, useWebGPU);

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
    const output = await transcriber(audio, opts as Parameters<ASRTranscriber>[1]);

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
