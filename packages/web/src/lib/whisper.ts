/**
 * Browser-side Whisper transcription, backed by a dedicated Web Worker (see
 * transcriber.worker.ts). The model is downloaded once from the Hugging Face Hub and
 * cached in the browser, so it runs fully offline afterwards.
 *
 * This module owns two jobs:
 *  1. Decode + resample any audio Blob the recorder/upload produced to the exact format
 *     Whisper expects: mono Float32Array at 16 kHz.
 *  2. Spawn the worker and surface download/inference progress to the caller.
 */

import type { TranscriptionResult } from "@/types";

export type ProgressCb = (progress: number, file?: string) => void;

/** Whisper model catalog surfaced in the UI. Sizes are approximate download sizes. */
export const WHISPER_MODELS = [
  { value: "turbo", label: "Turbo", size: "~1.5 GB", hint: "Best quality" },
  { value: "small", label: "Small", size: "~480 MB", hint: "Balanced" },
  { value: "base", label: "Base", size: "~150 MB", hint: "Fastest" },
] as const;

/** Decode an arbitrary audio Blob into 16 kHz mono Float32 PCM (whisper input). */
export async function blobToFloat32(audio: Blob): Promise<Float32Array> {
  const arrayBuffer = await audio.arrayBuffer();
  // A fresh AudioContext per call avoids reusing a closed/corrupted context.
  const AudioCtx =
    typeof window !== "undefined"
      ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtx) throw new Error("Web Audio API is not available in this environment");

  const decodeCtx = new AudioCtx();
  try {
    const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
    const targetRate = 16000;
    if (decoded.sampleRate === targetRate) {
      return downmixToMono(decoded);
    }
    // OfflineRenderer resamples to the target rate off the main thread.
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * targetRate),
      targetRate,
    );
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    void decodeCtx.close();
  }
}

/** Average all channels into one Float32Array. */
function downmixToMono(buffer: AudioBuffer): Float32Array {
  const { length, numberOfChannels } = buffer;
  if (numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const out = new Float32Array(length);
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += data[i];
  }
  for (let i = 0; i < length; i++) out[i] /= numberOfChannels;
  return out;
}

let worker: Worker | null = null;
function getWorker(): Worker {
  if (worker) return worker;
  // new URL(... import.meta.url) is the webpack/Next-safe way to ship a worker module.
  worker = new Worker(new URL("./transcriber.worker.ts", import.meta.url), {
    type: "module",
  });
  return worker;
}

export interface TranscribeInBrowserOptions {
  model?: string;
  language?: string;
  onProgress?: ProgressCb;
}

/** Transcribe an audio Blob entirely in the browser. */
export async function transcribeInBrowser(
  audio: Blob,
  options: TranscribeInBrowserOptions = {},
): Promise<TranscriptionResult> {
  const model = options.model ?? "turbo";
  const language = options.language ?? "es";

  // Report the (often slow) decode+resample step so the UI isn't silent.
  options.onProgress?.(0, "Preparing audio");
  const samples = await blobToFloat32(audio);
  options.onProgress?.(1, "Preparing audio");

  return new Promise<TranscriptionResult>((resolve, reject) => {
    const w = getWorker();
    const cleanup = () => w.removeEventListener("message", handler);
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "progress") {
        options.onProgress?.(data.progress as number, data.file as string);
        return;
      }
      if (data.type === "result") {
        cleanup();
        const chunks = data.chunks as { start: number; end: number; text: string }[];
        resolve({
          text: data.text,
          segments: chunks.map((c, i) => ({
            start: c.start,
            end: c.end,
            text: c.text,
            speaker: undefined,
            // segments with no speaker labels: keep an index for UI keys
          })) as TranscriptionResult["segments"],
          has_speakers: false,
          audio_filename: undefined,
        });
        return;
      }
      if (data.type === "error") {
        cleanup();
        reject(new Error(data.message as string));
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ audio: samples, model, language }, [samples.buffer]);
  });
}
