"use client";

import { useState } from "react";
import { Mic, Brain, ChevronDown, ChevronRight, Settings, Cpu, ShieldCheck } from "lucide-react";

import type { AppConfig } from "@/types";
import { WHISPER_MODELS, ENGLISH_ONLY_MODELS } from "@/lib/whisper";

interface ConfigPanelProps {
  config: AppConfig;
  onUpdate: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  isSyncing?: boolean;
}

const llmProviders = [
  {
    value: "openai",
    label: "OpenAI",
    modelKey: "openai_model" as const,
    keyField: "api_key_openai" as const,
    models: [
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "o4-mini", label: "o4 Mini" },
    ],
    keyPlaceholder: "sk-...",
    keyHint: "platform.openai.com/api-keys",
  },
  {
    value: "google",
    label: "Google Gemini",
    modelKey: "google_model" as const,
    keyField: "api_key_google" as const,
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
    keyPlaceholder: "AIza...",
    keyHint: "aistudio.google.com/apikey",
  },
  {
    value: "anthropic",
    label: "Claude (Anthropic)",
    modelKey: "anthropic_model" as const,
    keyField: "api_key_anthropic" as const,
    models: [
      { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
    keyPlaceholder: "sk-ant-...",
    keyHint: "console.anthropic.com/settings/keys",
  },
  {
    value: "zai",
    label: "Z.ai (GLM)",
    modelKey: "zai_model" as const,
    keyField: "api_key_zai" as const,
    models: [
      { value: "glm-4.6", label: "GLM-4.6 (200K ctx)" },
      { value: "glm-4.5", label: "GLM-4.5" },
      { value: "glm-4.5-air", label: "GLM-4.5 Air" },
      { value: "glm-4-plus", label: "GLM-4 Plus" },
      { value: "glm-4-flash", label: "GLM-4 Flash" },
    ],
    keyPlaceholder: "<your z.ai key>",
    keyHint: "z.ai/manage-apikey",
  },
  {
    value: "kimi",
    label: "Kimi (Moonshot)",
    modelKey: "kimi_model" as const,
    keyField: "api_key_kimi" as const,
    models: [
      { value: "kimi-k2.6", label: "Kimi K2.6" },
      { value: "moonshot-v1-128k", label: "Moonshot v1 128K" },
      { value: "moonshot-v1-32k", label: "Moonshot v1 32K" },
      { value: "moonshot-v1-8k", label: "Moonshot v1 8K" },
    ],
    keyPlaceholder: "sk-...",
    keyHint: "platform.moonshot.cn/console/api-keys",
  },
  {
    value: "ollama",
    label: "Ollama Cloud",
    modelKey: "ollama_model" as const,
    keyField: "api_key_ollama" as const,
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
];

export default function ConfigPanel({
  config,
  onUpdate,
  isSyncing,
}: ConfigPanelProps) {
  const [whisperOpen, setWhisperOpen] = useState(true);
  const [llmOpen, setLlmOpen] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const currentProvider = llmProviders.find((p) => p.value === config.llm_provider) ?? llmProviders[0];
  const selectedModel = (config[currentProvider.modelKey] as string) || currentProvider.models[0]?.value || "";

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

              <div>
                <label className="label text-[10px] mb-1">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => onUpdate(currentProvider.modelKey, e.target.value as never)}
                  className="select text-xs py-2"
                >
                  {currentProvider.models.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-[10px] mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={(config[currentProvider.keyField] as string) ?? ""}
                    onChange={(e) => onUpdate(currentProvider.keyField, e.target.value as never)}
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

              <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/5 border border-accent/15">
                <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {config.llm_provider === "ollama" ? (
                    <>Your key is stored locally and forwarded to {currentProvider.label} via our proxy (Ollama blocks direct browser calls). The proxy never stores your key. Insights need an internet connection; transcription is offline.</>
                  ) : (
                    <>Your key is stored locally and sent only to {currentProvider.label} — never to our servers. Insights need an internet connection; transcription is offline.</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
