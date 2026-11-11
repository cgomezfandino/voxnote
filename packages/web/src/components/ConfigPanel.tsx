import { useEffect, useState } from "react";
import {
  Mic,
  Brain,
  ChevronDown,
  ChevronRight,
  Settings,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Download,
  AlertTriangle,
  PlugZap,
  Loader2,
} from "lucide-react";

import type { AppConfig } from "@/types";
import { WHISPER_MODELS, ENGLISH_ONLY_MODELS } from "@/lib/whisper";
import { getDownloadedModels, hasUsableWebGPU } from "@/lib/capabilities";
import { testConnection } from "@/lib/api";
import { chromeAiAvailability } from "@/lib/insights";
import {
  clearApiKeys,
  getKeyStorageMode,
  setKeyStorageMode,
  type KeyStorageMode,
} from "@/lib/config-store";

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  isSyncing?: boolean;
}

type ProviderKind = "chrome" | "local" | "key";

interface ProviderDef {
  value: string;
  label: string;
  kind: ProviderKind;
  modelKey?: keyof AppConfig;
  keyField?: keyof AppConfig;
  models: { value: string; label: string }[];
  keyPlaceholder?: string;
  keyHint?: string;
  /** Sent through our same-origin relay because the provider blocks browser calls. */
  relayed?: boolean;
}

const llmProviders: ProviderDef[] = [
  {
    value: "chrome",
    label: "Chrome built-in AI — on this device, no key (recommended)",
    kind: "chrome",
    models: [],
  },
  {
    value: "openai",
    label: "OpenAI",
    kind: "key",
    modelKey: "openai_model",
    keyField: "api_key_openai",
    models: [
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "o4-mini", label: "o4 Mini (reasoning)" },
    ],
    keyPlaceholder: "sk-...",
    keyHint: "platform.openai.com/api-keys",
  },
  {
    value: "google",
    label: "Google Gemini",
    kind: "key",
    modelKey: "google_model",
    keyField: "api_key_google",
    models: [
      { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
    keyPlaceholder: "AIza...",
    keyHint: "aistudio.google.com/apikey",
  },
  {
    value: "anthropic",
    label: "Claude (Anthropic)",
    kind: "key",
    modelKey: "anthropic_model",
    keyField: "api_key_anthropic",
    models: [
      { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
      { value: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest, cheapest)" },
      { value: "claude-opus-5-5", label: "Claude Opus 5.5" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    ],
    keyPlaceholder: "sk-ant-...",
    keyHint: "console.anthropic.com/settings/keys",
  },
  {
    value: "zai",
    label: "Z.ai (GLM)",
    kind: "key",
    modelKey: "zai_model",
    keyField: "api_key_zai",
    relayed: true,
    models: [
      { value: "glm-4.7-flash", label: "GLM-4.7 Flash" },
      { value: "glm-4.6", label: "GLM-4.6 (200K ctx)" },
      { value: "glm-4.5", label: "GLM-4.5" },
      { value: "glm-4.5-air", label: "GLM-4.5 Air" },
    ],
    keyPlaceholder: "<your z.ai key>",
    keyHint: "z.ai/manage-apikey",
  },
  {
    value: "kimi",
    label: "Kimi (Moonshot)",
    kind: "key",
    modelKey: "kimi_model",
    keyField: "api_key_kimi",
    models: [
      { value: "kimi-k2.6", label: "Kimi K2.6" },
      { value: "moonshot-v1-128k", label: "Moonshot v1 128K (legacy)" },
      { value: "moonshot-v1-32k", label: "Moonshot v1 32K (legacy)" },
    ],
    keyPlaceholder: "sk-...",
    keyHint: "platform.moonshot.ai/console/api-keys",
  },
  {
    value: "ollama",
    label: "Ollama Cloud (open models)",
    kind: "key",
    modelKey: "ollama_model",
    keyField: "api_key_ollama",
    relayed: true,
    models: [
      { value: "gemma4:31b", label: "Gemma 4 31B (recommended)" },
      { value: "gpt-oss:120b", label: "GPT-OSS 120B" },
      { value: "gpt-oss:20b", label: "GPT-OSS 20B" },
      { value: "nemotron-3-nano:30b", label: "Nemotron 3 Nano 30B" },
      { value: "minimax-m3", label: "MiniMax M3" },
      { value: "glm-5.2", label: "GLM-5.2 (subscription)" },
      { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro (subscription)" },
      { value: "kimi-k3", label: "Kimi K3 (subscription)" },
      { value: "qwen3.5:397b", label: "Qwen 3.5 397B (subscription)" },
      { value: "mistral-large-3:675b", label: "Mistral Large 3 (subscription)" },
    ],
    keyPlaceholder: "<your ollama key>",
    keyHint: "ollama.com/settings/keys",
  },
  {
    value: "ollama_local",
    label: "Ollama on this computer (advanced, no key)",
    kind: "local",
    modelKey: "ollama_local_model",
    models: [],
  },
];

type TestState =
  | { status: "idle" }
  | { status: "testing"; progress?: number }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export default function ConfigPanel({
  config,
  onUpdate,
  isSyncing,
}: ConfigPanelProps) {
  const [whisperOpen, setWhisperOpen] = useState(true);
  const [llmOpen, setLlmOpen] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [keyMode, setKeyMode] = useState<KeyStorageMode>(() => getKeyStorageMode());
  const [modelDownloaded, setModelDownloaded] = useState<boolean | null>(null);
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [chromeAi, setChromeAi] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const [localModels, setLocalModels] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDownloadedModels().then((set) => {
      if (!cancelled) setModelDownloaded(set.has(config.whisper_model));
    });
    return () => {
      cancelled = true;
    };
  }, [config.whisper_model]);

  useEffect(() => {
    let cancelled = false;
    void hasUsableWebGPU().then((ok) => !cancelled && setWebgpu(ok));
    void chromeAiAvailability().then((a) => !cancelled && setChromeAi(a));
    return () => {
      cancelled = true;
    };
  }, []);

  const currentProvider =
    llmProviders.find((p) => p.value === config.llm_provider) ?? llmProviders[0];
  const selectedModel = currentProvider.modelKey
    ? ((config[currentProvider.modelKey] as string) ?? "")
    : "";
  const selectedKey = currentProvider.keyField
    ? ((config[currentProvider.keyField] as string) ?? "")
    : "";

  // A previous result no longer describes the current settings.
  useEffect(() => {
    setTest({ status: "idle" });
  }, [config.llm_provider, selectedModel, selectedKey, config.ollama_local_url]);

  const handleKeyMode = (mode: KeyStorageMode) => {
    setKeyMode(mode);
    setKeyStorageMode(mode);
  };

  const handleClearKeys = () => {
    clearApiKeys();
    (Object.keys(config) as (keyof AppConfig)[])
      .filter((k) => k.startsWith("api_key_"))
      .forEach((k) => onUpdate(k, "" as never));
  };

  const handleTest = async () => {
    setTest({ status: "testing" });
    try {
      // Called straight from the click: Chrome only starts the Gemini Nano
      // download inside a user gesture.
      const result = await testConnection(config.llm_provider, (pct) =>
        setTest({ status: "testing", progress: pct }),
      );
      if (result.models) setLocalModels(result.models);
      setTest({ status: "ok", message: result.message });
      if (config.llm_provider === "chrome") setChromeAi(await chromeAiAvailability());
    } catch (err) {
      setTest({
        status: "error",
        message: err instanceof Error ? err.message : "The connection test failed.",
      });
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const turboWithoutGpu = webgpu === false && config.whisper_model === "turbo";

  return (
    <div className="flex flex-col h-full text-foreground">
      {/* Header */}
      <div className="flex-shrink-0 mb-4 pb-3 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Settings</h2>
          </div>
          {isSyncing && (
            <span className="flex items-center gap-1 text-xs text-accent font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Accordions */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {/* Section 1: Transcription (Whisper) */}
        <div className="border border-[var(--accordion-border)] rounded-xl bg-[var(--accordion-bg)] overflow-hidden">
          <button
            onClick={() => setWhisperOpen(!whisperOpen)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-foreground/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transcription</span>
            </div>
            {whisperOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>

          {whisperOpen && (
            <div className="p-3 space-y-3 border-t border-[var(--accordion-border)] bg-[var(--accordion-content-bg)]">
              <div>
                <label className="label text-[10px] mb-1">Whisper Model</label>
                <select
                  value={config.whisper_model}
                  onChange={(e) => onUpdate("whisper_model", e.target.value)}
                  className="select text-xs py-2"
                >
                  {WHISPER_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.size})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {(() => {
                    const m = WHISPER_MODELS.find((x) => x.value === config.whisper_model);
                    return m ? `${m.hint} · downloads once, then works offline` : "";
                  })()}
                </p>
                {turboWithoutGpu && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-danger-light border border-danger-border">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                    <div className="text-[10px] text-foreground leading-relaxed space-y-1.5">
                      <p>
                        This browser has no usable WebGPU, so Turbo would run on the CPU and be far
                        too slow. Small gives good multilingual quality without a GPU.
                      </p>
                      <button
                        type="button"
                        onClick={() => onUpdate("whisper_model", "small")}
                        className="font-bold uppercase tracking-wider text-primary hover:underline"
                      >
                        Use Small instead
                      </button>
                    </div>
                  </div>
                )}
                {modelDownloaded !== null &&
                  (modelDownloaded ? (
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-accent mt-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Already downloaded on this device — it will not download again.
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5">
                      <Download className="w-3.5 h-3.5" />
                      First use downloads it once on this device; after that it works offline.
                    </p>
                  ))}
              </div>

              <div>
                <label className="label text-[10px] mb-1">Language</label>
                <select
                  value={config.language}
                  onChange={(e) => onUpdate("language", e.target.value)}
                  className="select text-xs py-2"
                >
                  <option value="es">Spanish (ES)</option>
                  <option value="en">English (EN)</option>
                  <option value="fr">French (FR)</option>
                  <option value="de">German (DE)</option>
                  <option value="it">Italian (IT)</option>
                  <option value="pt">Portuguese (PT)</option>
                  <option value="zh">Chinese (ZH)</option>
                  <option value="ja">Japanese (JA)</option>
                </select>
                {ENGLISH_ONLY_MODELS.has(config.whisper_model) && config.language !== "en" && (
                  <p className="text-[10px] text-[var(--danger)] mt-1">
                    This model is English-only. Switch to English or pick a multilingual model.
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                <Cpu className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Runs entirely in your browser. WebGPU is used when available; otherwise CPU (slower).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: AI Engine (LLM Provider) */}
        <div className="border border-[var(--accordion-border)] rounded-xl bg-[var(--accordion-bg)] overflow-hidden">
          <button
            onClick={() => setLlmOpen(!llmOpen)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-foreground/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Brain className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Engine</span>
            </div>
            {llmOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>

          {llmOpen && (
            <div className="p-3 space-y-3 border-t border-[var(--accordion-border)] bg-[var(--accordion-content-bg)]">
              <div>
                <label className="label text-[10px] mb-1">Provider</label>
                <select
                  value={config.llm_provider}
                  onChange={(e) => onUpdate("llm_provider", e.target.value)}
                  className="select text-xs py-2"
                >
                  {llmProviders.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>

              {currentProvider.kind === "chrome" && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Gemini Nano runs inside Chrome on this device: no API key, and the
                    transcript never leaves your computer. Chrome downloads it once (a few
                    GB, managed by Chrome itself). Needs desktop Chrome with a capable GPU.
                  </p>
                  {chromeAi === "unavailable" && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-danger-light border border-danger-border">
                      <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-foreground leading-relaxed">
                        Not available in this browser or on this device. Choose another provider
                        — for example Ollama Cloud for open models, or one where you have an API key.
                      </p>
                    </div>
                  )}
                  {(chromeAi === "downloadable" || chromeAi === "downloading") && (
                    <p className="text-[10px] text-foreground leading-relaxed">
                      Chrome hasn&apos;t downloaded the model yet. Click “Test connection” to
                      start the download now, so your first note doesn&apos;t have to wait.
                    </p>
                  )}
                </div>
              )}

              {currentProvider.kind === "local" && (
                <div className="space-y-3">
                  <div>
                    <label className="label text-[10px] mb-1">Ollama address</label>
                    <input
                      value={config.ollama_local_url}
                      onChange={(e) => onUpdate("ollama_local_url", e.target.value)}
                      className="input text-xs py-2"
                      placeholder="http://localhost:11434"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="label text-[10px] mb-1">Model</label>
                    <input
                      value={config.ollama_local_model}
                      onChange={(e) => onUpdate("ollama_local_model", e.target.value)}
                      list="models-ollama_local"
                      className="input text-xs py-2"
                      placeholder="e.g. gemma3:4b — Test connection lists your installed models"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <datalist id="models-ollama_local">
                      {localModels.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 text-[10px] text-muted-foreground leading-relaxed space-y-1">
                    <p className="font-semibold text-foreground">One-time setup</p>
                    <p>1. Install Ollama from ollama.com and pull a model, e.g. <code className="font-mono">ollama pull gemma3:4b</code>.</p>
                    <p>
                      2. Allow this site to talk to it, then restart Ollama:{" "}
                      <code className="font-mono break-all">OLLAMA_ORIGINS={origin}</code>{" "}
                      (macOS: <code className="font-mono break-all">launchctl setenv OLLAMA_ORIGINS {origin}</code>).
                    </p>
                    <p>3. If Chrome asks to access devices on your local network, allow it.</p>
                  </div>
                </div>
              )}

              {currentProvider.kind === "key" && (
                <>
                  <div>
                    <label className="label text-[10px] mb-1">Model</label>
                    <input
                      value={selectedModel}
                      onChange={(e) =>
                        currentProvider.modelKey &&
                        onUpdate(currentProvider.modelKey, e.target.value as never)
                      }
                      list={`models-${currentProvider.value}`}
                      className="input text-xs py-2"
                      placeholder="Pick a suggestion or type any model id"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <datalist id={`models-${currentProvider.value}`}>
                      {currentProvider.models.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </datalist>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Suggestions are listed, but you can type any model id this
                      provider offers (it is sent exactly as written).
                    </p>
                  </div>

                  <div>
                    <label className="label text-[10px] mb-1">API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={selectedKey}
                        onChange={(e) =>
                          currentProvider.keyField &&
                          onUpdate(currentProvider.keyField, e.target.value as never)
                        }
                        placeholder={currentProvider.keyPlaceholder}
                        className="input text-xs py-2 pr-12"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Get yours at {currentProvider.keyHint}. Stored only in this browser.
                    </p>
                  </div>
                </>
              )}

              {/* Connection test — catches bad keys/models before a long recording */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={test.status === "testing"}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-2 disabled:opacity-60"
                >
                  {test.status === "testing" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlugZap className="w-3.5 h-3.5" />
                  )}
                  {test.status === "testing"
                    ? test.progress !== undefined && test.progress < 100
                      ? `Downloading model… ${test.progress}%`
                      : currentProvider.kind === "chrome"
                        ? "Loading Chrome's model (first time can take ~30 s)…"
                        : "Testing…"
                    : "Test connection"}
                </button>
                {test.status === "ok" && (
                  <p role="status" className="flex items-start gap-1.5 text-[10px] font-semibold text-accent">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    {test.message}
                  </p>
                )}
                {test.status === "error" && (
                  <p role="alert" className="flex items-start gap-1.5 text-[10px] text-[var(--danger)] leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {test.message}
                  </p>
                )}
                {currentProvider.kind === "key" && test.status === "idle" && (
                  <p className="text-[10px] text-muted-foreground">
                    Sends a tiny request (a few tokens) to check the key and the model.
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/5 border border-accent/15">
                <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {currentProvider.kind === "chrome" ? (
                    <>Fully local: Chrome runs Gemini Nano on this device. No key, no network, no transcript leaves the machine. Transcription (Whisper) is always local too.</>
                  ) : currentProvider.kind === "local" ? (
                    <>Fully local: the transcript only goes to the Ollama server on this computer. No key, nothing sent to the internet.</>
                  ) : currentProvider.relayed ? (
                    <>Your key is stored locally and forwarded to {currentProvider.label} through our relay ({currentProvider.label} blocks direct browser calls). The relay never stores or logs your key or text. Insights need an internet connection; transcription is offline.</>
                  ) : (
                    <>Your key is stored locally and sent only to {currentProvider.label} — never to our servers. Insights need an internet connection; transcription is offline.</>
                  )}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="label text-[10px] mb-1">API key storage</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleKeyMode("local")}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${keyMode === "local" ? "bg-primary/10 border-primary/40 text-foreground" : "border-border text-muted-foreground"}`}
                  >
                    Remember
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeyMode("session")}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${keyMode === "session" ? "bg-primary/10 border-primary/40 text-foreground" : "border-border text-muted-foreground"}`}
                  >
                    This session only
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {keyMode === "session"
                    ? "Keys are kept only for this tab session and are not saved with your settings. (A browser that restores tabs after a restart may restore them too.)"
                    : "Keys persist in this browser. Anyone with access to this browser profile can read them, so prefer session-only on shared machines."}
                </p>
                <button
                  type="button"
                  onClick={handleClearKeys}
                  className="text-[10px] font-bold uppercase tracking-wider text-[var(--danger)] hover:underline"
                >
                  Forget all API keys
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
