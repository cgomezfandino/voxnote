"use client";

import { useState, useEffect } from "react";
import { Mic, Brain, Users, Link, ChevronDown, ChevronRight, Search, Settings } from "lucide-react";

import type { AppConfig } from "@/types";
import { listOllamaModels } from "@/lib/api";

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  isSyncing?: boolean;
}

const whisperModels = [
  { value: "tiny", label: "Tiny" },
  { value: "base", label: "Base" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "turbo", label: "Turbo" },
  { value: "large-v3", label: "Large" },
];

const llmProviders = [
  {
    value: "ollama",
    label: "Ollama (Local)",
    needsUrl: true,
    models: [
      { value: "gemma4:12b", label: "Gemma 4 12B" },
      { value: "llama3.1:8b", label: "Llama 3.1 8B" },
      { value: "qwen3:8b", label: "Qwen 3 8B" },
      { value: "gemma3:12b", label: "Gemma 3 12B" },
      { value: "phi4:14b", label: "Phi-4 14B" },
      { value: "deepseek-r1:8b", label: "DeepSeek R1 8B" },
      { value: "mistral-small3.2:24b", label: "Mistral Small 3.2 24B" },
      { value: "llama3.3:70b", label: "Llama 3.3 70B" },
    ],
    modelKey: "ollama_model" as const,
  },
  {
    value: "ollama-cloud",
    label: "Ollama (Cloud)",
    needsUrl: true,
    models: [],
    modelKey: "ollama_model" as const,
  },
  {
    value: "openai",
    label: "OpenAI",
    needsUrl: false,
    models: [
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "o4-mini", label: "o4 Mini" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
    modelKey: "openai_model" as const,
  },
  {
    value: "google",
    label: "Google",
    needsUrl: false,
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
    modelKey: "google_model" as const,
  },
  {
    value: "anthropic",
    label: "Claude (Anthropic)",
    needsUrl: false,
    models: [
      { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
    modelKey: "anthropic_model" as const,
  },
];

const defaultBaseUrls: Record<string, string> = {
  ollama: "http://localhost:11434",
  "ollama-cloud": "https://ollama.com",
};

const isOllama = (p: string) => p === "ollama" || p === "ollama-cloud";

export default function ConfigPanel({
  config,
  onUpdate,
  isSyncing,
}: ConfigPanelProps) {
  const currentProvider = llmProviders.find(p => p.value === config.llm_provider);
  const [dynamicOllamaModels, setDynamicOllamaModels] = useState<any[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");

  // Accordion open/close states
  const [whisperOpen, setWhisperOpen] = useState(true);
  const [llmOpen, setLlmOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!isOllama(config.llm_provider)) return;
    setOllamaStatus("checking");
    // Debounce 700ms (> the 500ms config sync) so the backend has the latest
    // url/key before we ask it for models.
    const t = setTimeout(() => {
      listOllamaModels()
        .then((models) => {
          setDynamicOllamaModels(models);
          setOllamaStatus("online");
        })
        .catch(() => {
          setDynamicOllamaModels([]);
          setOllamaStatus("offline");
        });
    }, 700);
    return () => clearTimeout(t);
  }, [config.llm_provider, config.ollama_url, config.ollama_api_key]);

  useEffect(() => {
    if (isOllama(config.llm_provider) && dynamicOllamaModels.length > 0) {
      const currentModelExists = dynamicOllamaModels.some((m) => m.value === config.ollama_model);
      if (!currentModelExists) {
        // @ts-ignore - we know ollama_model is a valid key
        onUpdate("ollama_model", dynamicOllamaModels[0].value);
      }
    }
  }, [config.llm_provider, config.ollama_model, dynamicOllamaModels, onUpdate]);

  let modelsToDisplay = currentProvider?.models || [];
  if (isOllama(currentProvider?.value ?? "") && dynamicOllamaModels.length > 0) {
    modelsToDisplay = dynamicOllamaModels;
  }

  // Filter models based on search term
  const filteredModels = modelsToDisplay.filter(m =>
    m.label.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.value.toLowerCase().includes(modelSearch.toLowerCase())
  );

  let selectedModel = "";
  if (currentProvider && currentProvider.modelKey) {
    selectedModel = config[currentProvider.modelKey as keyof AppConfig] as string;
  }
  if (!selectedModel && modelsToDisplay.length > 0) {
    selectedModel = modelsToDisplay[0].value;
  }

  return (
    <div className="flex flex-col h-full text-foreground">
      {/* Header - Compact */}
      <div className="flex-shrink-0 mb-4 pb-3 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Settings</h2>
          </div>
          {isSyncing && (
            <span className="flex items-center gap-1 text-xs text-accent font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Syncing
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
                  {whisperModels.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
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
                </select>
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
                  onChange={(e) => {
                    const p = e.target.value;
                    onUpdate("llm_provider", p);
                    setModelSearch("");
                    // Auto-set the endpoint per Ollama variant; the user never types a URL.
                    if (isOllama(p) && defaultBaseUrls[p]) {
                      onUpdate("ollama_url", defaultBaseUrls[p]);
                    }
                    // Cloud needs the API key — open the Connection panel so it's visible.
                    if (p === "ollama-cloud") setAdvancedOpen(true);
                  }}
                  className="select text-xs py-2"
                >
                  {llmProviders.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
              </div>

              {/* Model selector per provider */}
              {modelsToDisplay.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label text-[10px] mb-0">Model</label>
                    {modelsToDisplay.length > 5 && (
                      <div className="relative flex items-center">
                        <Search className="absolute left-1.5 w-3 h-3 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          className="w-24 pl-5 pr-1 py-0.5 rounded bg-foreground/5 border border-border text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                        />
                      </div>
                    )}
                  </div>
                  <select
                    value={selectedModel}
                    onChange={(e) => onUpdate(currentProvider!.modelKey as keyof AppConfig, e.target.value as never)}
                    className="select text-xs py-2"
                  >
                    {filteredModels.length > 0 ? (
                      filteredModels.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))
                    ) : (
                      <option value="" disabled>No matches</option>
                    )}
                  </select>
                </div>
              )}

              {/* Status banner for Ollama — reflects the live /api/ollama/models probe */}
              {isOllama(config.llm_provider) && (() => {
                const cloud = config.llm_provider === "ollama-cloud";
                const status = {
                  checking: { wrap: "bg-foreground/5 border-border", text: "text-muted-foreground", dot: "bg-muted-foreground animate-pulse", label: cloud ? "Checking Ollama Cloud…" : "Checking Ollama…" },
                  online: { wrap: "bg-accent/5 border-accent/15", text: "text-accent", dot: "bg-accent animate-pulse", label: cloud ? "Ollama Cloud active" : "Ollama active" },
                  offline: { wrap: "bg-[var(--danger-light)] border-[var(--danger-border)]", text: "text-[var(--danger)]", dot: "bg-[var(--danger)]", label: cloud ? "Ollama Cloud unavailable" : "Ollama unavailable" },
                }[ollamaStatus];
                return (
                  <div className={`p-2 rounded-lg border ${status.wrap}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] font-medium ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Section 3: Connection & Advanced (Diarization, API Urls, Keys) */}
        <div className="border border-[var(--accordion-border)] rounded-xl bg-[var(--accordion-bg)] overflow-hidden">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-foreground/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connection / Diarization</span>
            </div>
            {advancedOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          
          {advancedOpen && (
            <div className="p-3 space-y-3 border-t border-[var(--accordion-border)] bg-[var(--accordion-content-bg)]">
              {/* Speaker Diarization */}
              <div className="py-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.diarize}
                    onChange={(e) => onUpdate("diarize", e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                  />
                  <div>
                    <span className="text-xs font-semibold">Identify speakers</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Requires whisperx installed</p>
                  </div>
                </label>
              </div>

              {/* Base URL Input for Ollama */}
              {currentProvider?.needsUrl && (
                <div className="pt-2.5 border-t border-[var(--accordion-border)] space-y-3">
                  <div>
                    <label className="label text-[10px] flex items-center gap-1.5 mb-1">
                      <Link className="w-3 h-3 text-muted-foreground" />
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={config.ollama_url ?? ""}
                      onChange={(e) => onUpdate("ollama_url", e.target.value)}
                      placeholder="http://localhost:11434"
                      className="input text-xs py-2"
                    />
                  </div>

                  <div>
                    <label className="label text-[10px] mb-1">
                      {config.llm_provider === "ollama-cloud" ? "API Key (required)" : "API Key (optional)"}
                    </label>
                    <input
                      type="password"
                      value={config.ollama_api_key || ""}
                      onChange={(e) => onUpdate("ollama_api_key", e.target.value)}
                      placeholder="Bearer token or API key"
                      className="input text-xs py-2"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {config.llm_provider === "ollama-cloud"
                        ? "Your Ollama Cloud API key (ollama.com/settings/keys). The endpoint is configured automatically."
                        : "Required only if the Ollama instance is protected by a proxy or is Cloud."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
