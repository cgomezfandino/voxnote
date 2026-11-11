import { useCallback, useEffect, useState } from "react";
import { Cpu, HardDrive, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { WHISPER_MODELS } from "@/lib/whisper";
import {
  clearModelCache,
  eraseAllLocalData,
  formatBytes,
  getCapabilities,
  getDownloadedModels,
  type Capabilities,
} from "@/lib/capabilities";
import { chromeAiAvailability } from "@/lib/insights";

export default function ModelManager() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [chromeAi, setChromeAi] = useState<string>("…");
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setCaps(await getCapabilities());
    setDownloaded(await getDownloadedModels());
    setChromeAi(await chromeAiAvailability());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [erasing, setErasing] = useState(false);

  const handleEraseAll = async () => {
    const ok = window.confirm(
      "Erase ALL voxnote data in this browser? This deletes your notes, the current recording and transcript, any API keys, your settings and the downloaded models. It can't be undone.",
    );
    if (!ok) return;
    setErasing(true);
    await eraseAllLocalData();
    window.location.assign("/");
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const removed = await clearModelCache();
      setDownloaded(new Set());
      setCleared(
        removed.length
          ? `Removed: ${removed.join(", ")}. The model will download again on next transcription.`
          : "No model cache found (it may be stored under a different name).",
      );
      await refresh();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          On-device models
        </h3>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Transcription runs locally with Whisper, downloaded once from Hugging
        Face and cached in this browser — it is not a Chrome Web Store download
        and it works offline afterwards. Insights are local only with the
        Chrome built-in AI provider; every other provider receives the
        transcript text (never the audio) with your own API key.
      </p>

      <ul className="text-sm space-y-1.5">
        {WHISPER_MODELS.map((m) => (
          <li key={m.value} className="flex justify-between gap-3 items-center">
            <span className="text-foreground">{m.label}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span>
                {m.size} · {m.hint}
              </span>
              {downloaded.has(m.value) ? (
                <span className="badge-success badge">Downloaded</span>
              ) : (
                <span className="badge-primary badge">Not downloaded</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {caps && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <span>
              WebGPU: {caps.webgpu ? "available" : "not available (CPU only — use the Small or Base model)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <span>
              Cross-origin isolated: {caps.crossOriginIsolated ? "yes" : "no"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary shrink-0" />
            <span>
              Browser storage:{" "}
              {caps.storageEstimate
                ? `${formatBytes(caps.storageEstimate.usage)} used`
                : "unknown"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary shrink-0" />
            <span>Chrome built-in AI (Gemini Nano): {chromeAi}</span>
          </div>
        </dl>
      )}
      {caps && (
        <p className="text-xs text-muted-foreground">
          Model caches detected:{" "}
          {caps.modelCacheNames.length
            ? caps.modelCacheNames.join(", ")
            : "none yet (the model downloads on first transcription)"}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleClear}
          disabled={clearing}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {clearing ? "Clearing…" : "Delete downloaded model"}
        </button>
        {cleared && <span className="text-xs text-muted-foreground">{cleared}</span>}
      </div>

      <div className="pt-3 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Everything voxnote keeps lives only in this browser. To remove it all
          (notes, current recording, API keys, settings and models):
        </p>
        <button
          onClick={handleEraseAll}
          disabled={erasing}
          className="btn-secondary flex items-center gap-2 text-[var(--danger)] disabled:opacity-50"
        >
          <ShieldAlert className="w-4 h-4" />
          {erasing ? "Erasing…" : "Erase all local data"}
        </button>
      </div>
    </div>
  );
}
