/**
 * Browser capability + model-cache introspection for the Settings UI.
 * Everything here is read-only except clearModelCache().
 */

export interface Capabilities {
  webgpu: boolean;
  crossOriginIsolated: boolean;
  secureContext: boolean;
  storageEstimate: { usage: number; quota: number } | null;
  modelCacheNames: string[];
}

export async function getCapabilities(): Promise<Capabilities> {
  let storageEstimate: Capabilities["storageEstimate"] = null;
  try {
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      storageEstimate = { usage: e.usage ?? 0, quota: e.quota ?? 0 };
    }
  } catch {
    storageEstimate = null;
  }
  let modelCacheNames: string[] = [];
  try {
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      modelCacheNames = names.filter((n) =>
        /transformers|onnx|whisper|hf|huggingface/i.test(n),
      );
    }
  } catch {
    modelCacheNames = [];
  }
  return {
    webgpu:
      typeof navigator !== "undefined" &&
      "gpu" in (navigator as Navigator & { gpu?: unknown }),
    crossOriginIsolated:
      typeof window !== "undefined" && window.crossOriginIsolated === true,
    secureContext: typeof window !== "undefined" && window.isSecureContext,
    storageEstimate,
    modelCacheNames,
  };
}

/** Delete cached Whisper model weights (they re-download on next use). */
export async function clearModelCache(): Promise<string[]> {
  if (typeof caches === "undefined") return [];
  const names = await caches.keys();
  const targets = names.filter((n) =>
    /transformers|onnx|whisper|hf|huggingface/i.test(n),
  );
  await Promise.all(targets.map((n) => caches.delete(n)));
  return targets;
}

/**
 * Which Whisper models are already downloaded on this device.
 *
 * transformers.js stores model files in the Cache API under
 * "transformers-cache", keyed by their full Hugging Face URL — which includes
 * the pinned revision SHA. A model counts as downloaded when a weight file
 * (.onnx) for its revision is present, not just its config files.
 * Revisions mirror MODEL_REVISIONS in transcriber.worker.ts.
 */
const MODEL_REVISIONS: Record<string, string> = {
  base: "27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c",
  small: "36050c46d777d46dc4b5f43f6d90574fc38f8732",
  turbo: "360ebcde2559d60bb474678be3c1de9ef347d01a",
  moonshine: "a6da1241cd305dcd64eab1edbd615f2bb9aabb95",
};

export async function getDownloadedModels(): Promise<Set<string>> {
  const found = new Set<string>();
  if (typeof caches === "undefined") return found;
  try {
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    const urls = keys.map((k) => k.url);
    for (const [model, revision] of Object.entries(MODEL_REVISIONS)) {
      if (urls.some((u) => u.includes(`/${revision}/`) && u.includes(".onnx"))) {
        found.add(model);
      }
    }
  } catch {
    // cache unavailable (private mode, etc.) — report nothing downloaded
  }
  return found;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}
