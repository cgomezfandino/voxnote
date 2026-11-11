/**
 * Single source of truth for the speech-to-text models: Hub ids, pinned
 * revisions and ONNX dtypes. Imported by the transcription worker and by the
 * UI (capabilities.ts) so the two can never drift apart.
 */

/** Maps the short label used in the UI to the Hugging Face model id. */
export const MODEL_IDS: Record<string, string> = {
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
export const MODEL_REVISIONS: Record<string, string> = {
  base: "27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c",
  small: "36050c46d777d46dc4b5f43f6d90574fc38f8732",
  turbo: "360ebcde2559d60bb474678be3c1de9ef347d01a",
  moonshine: "a6da1241cd305dcd64eab1edbd615f2bb9aabb95",
};

export type WhisperDtype = "fp32" | "fp16" | "q8" | "q4";

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
 * Turbo uses q4 (*_q4.onnx, MatMulNBits — native WebGPU kernels). Its q8 files
 * (*_quantized.onnx, dynamic uint8 quantization) have no WebGPU kernels for the
 * quantized MatMuls, so onnxruntime runs them on the CPU: on speech it is merely
 * slow, but on non-speech audio (silence, muted mic, a tone) the decoder never
 * finished in >3 min (reproduced 2026-11-11). q4 ran the same input in ~8 s and is
 * ~760 MB instead of ~1.1 GB. fp16 is avoided (WebGPU precision bug, #1590).
 * The small models keep q8 on WebGPU and switch to fp32 on WASM (see the worker).
 */
export const MODEL_DTYPES: Record<string, WhisperDtype> = {
  base: "q8",
  small: "q8",
  turbo: "q4",
  moonshine: "fp32",
};

/** ONNX filename suffix transformers.js uses for each dtype. */
export const DTYPE_SUFFIX: Record<WhisperDtype, string> = {
  fp32: ".onnx",
  fp16: "_fp16.onnx",
  q8: "_quantized.onnx",
  q4: "_q4.onnx",
};

/**
 * Weight files from a previous dtype of the same pinned revision that are no
 * longer used and can be evicted from the cache (Turbo moved q8 → q4).
 */
export const STALE_WEIGHTS: Record<string, RegExp> = {
  turbo: /\/onnx\/[^/]+_quantized\.onnx$/,
};

/** English-only models that must not receive a `language` option. */
export const ENGLISH_ONLY = new Set(["moonshine"]);
