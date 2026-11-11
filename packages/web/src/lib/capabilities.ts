/**
 * Browser capability + model-cache introspection for the Settings UI.
 * Everything here is read-only except clearModelCache().
 */

import { DTYPE_SUFFIX, MODEL_DTYPES, MODEL_REVISIONS } from "./whisper-catalog";

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
    webgpu: await hasUsableWebGPU(),
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
 * the pinned revision SHA. A model counts as downloaded when an encoder weight
 * file for its revision is present, not just its config files. For Turbo the
 * dtype matters (only q4 is used now; a leftover q8 download doesn't count).
 */
export async function getDownloadedModels(): Promise<Set<string>> {
  const found = new Set<string>();
  if (typeof caches === "undefined") return found;
  try {
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    const urls = keys.map((k) => k.url);
    for (const [model, revision] of Object.entries(MODEL_REVISIONS)) {
      const weight =
        model === "turbo"
          ? (u: string) => u.endsWith(`encoder_model${DTYPE_SUFFIX[MODEL_DTYPES.turbo]}`)
          : (u: string) => u.includes(".onnx");
      if (urls.some((u) => u.includes(`/${revision}/`) && weight(u))) {
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

let webgpuProbe: Promise<boolean> | null = null;

/**
 * True only when a real GPU adapter can be obtained — `navigator.gpu` existing
 * is not enough (blocked drivers, VMs, some Linux setups return no adapter).
 * Mirrors the worker's own preflight. Turbo needs this; without it, Small is
 * the practical choice.
 */
export function hasUsableWebGPU(): Promise<boolean> {
  if (webgpuProbe) return webgpuProbe;
  webgpuProbe = (async () => {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
      return !!gpu && !!(await gpu.requestAdapter());
    } catch {
      return false;
    }
  })();
  return webgpuProbe;
}

/**
 * Erase everything voxnote keeps in this browser: settings and API keys
 * (local + session storage), notes, the draft and any half-saved recording
 * (IndexedDB), and downloaded models (Cache API). The page should be reloaded
 * afterwards so in-memory state is dropped too.
 */
export async function eraseAllLocalData(): Promise<void> {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      for (const k of Object.keys(store)) if (k.startsWith("voxnote:")) store.removeItem(k);
    } catch {
      // storage unavailable
    }
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase("voxnote");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
  try {
    if (typeof caches !== "undefined") {
      for (const name of await caches.keys()) {
        if (/transformers|onnx|whisper|hf|huggingface/i.test(name)) await caches.delete(name);
      }
    }
  } catch {
    // Cache API unavailable
  }
}
