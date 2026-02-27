"use client";

import { useState } from "react";
import { Mic, Brain, Users, Key, Link, Eye, EyeOff } from "lucide-react";

import type { AppConfig } from "@/types";

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
    needsKey: false,
    needsUrl: true,
    models: [
      { value: "llama3.1:8b", label: "Llama 3.1 8B" },
      { value: "llama3.2:3b", label: "Llama 3.2 3B" },
      { value: "mistral:7b", label: "Mistral 7B" },
      { value: "gemma2:9b", label: "Gemma 2 9B" },
      { value: "qwen2.5:7b", label: "Qwen 2.5 7B" },
    ],
    modelKey: "ollama_model" as const,
  },
  {
    value: "openai",
    label: "OpenAI",
    needsKey: true,
    needsUrl: false,
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    modelKey: "openai_model" as const,
  },
  {
    value: "kimi",
    label: "Kimi (Moonshot)",
    needsKey: true,
    needsUrl: true,
    models: [
      { value: "moonshot-v1-8k", label: "Moonshot v1 8K" },
      { value: "moonshot-v1-32k", label: "Moonshot v1 32K" },
      { value: "moonshot-v1-128k", label: "Moonshot v1 128K" },
    ],
    modelKey: "kimi_model" as const,
  },
  {
    value: "glm",
    label: "GLM (Zhipu)",
    needsKey: true,
    needsUrl: true,
    models: [
      { value: "glm-4", label: "GLM-4" },
      { value: "glm-4-plus", label: "GLM-4 Plus" },
      { value: "glm-4-air", label: "GLM-4 Air" },
      { value: "glm-4.7", label: "GLM-4.7" },
      { value: "glm-5", label: "GLM-5" },
    ],
    modelKey: "glm_model" as const,
  },
  {
    value: "google",
    label: "Google",
    needsKey: true,
    needsUrl: false,
    models: [
      { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
    modelKey: "google_model" as const,
  },
];

const defaultBaseUrls: Record<string, string> = {
  ollama: "http://localhost:11434",
  glm: "https://open.bigmodel.cn/api/paas/v4",
  kimi: "https://api.moonshot.cn",
};

export default function ConfigPanel({
  config,
  onUpdate,
  isSyncing,
}: ConfigPanelProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const currentProvider = llmProviders.find(p => p.value === config.llm_provider);

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Compact */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Configuración</h2>
          {isSyncing && (
            <span className="text-xs text-muted-foreground animate-pulse">Guardando...</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Personaliza el procesamiento</p>
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">

      {/* Whisper */}
      <div className="card !p-3">
        <div className="flex items-center gap-2 mb-2">
          <Mic className="w-3.5 h-3.5 text-primary" />
          <span className="badge-primary text-xs">Whisper</span>
        </div>
        
        <div className="space-y-2">
          <div>
            <label className="label text-xs mb-1">Modelo</label>
            <select
              value={config.whisper_model}
              onChange={(e) => onUpdate("whisper_model", e.target.value)}
              className="select text-sm py-1.5"
            >
              {whisperModels.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="label text-xs mb-1">Idioma</label>
            <select
              value={config.language}
              onChange={(e) => onUpdate("language", e.target.value)}
              className="select text-sm py-1.5"
            >
              <option value="es">ES - Español</option>
              <option value="en">EN - English</option>
            </select>
          </div>
        </div>
      </div>

      {/* LLM Provider */}
      <div className="card !p-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="badge-primary text-xs">LLM Provider</span>
        </div>
        
        <div className="space-y-1.5">
          {llmProviders.map((provider) => (
            <button
              key={provider.value}
              onClick={() => onUpdate("llm_provider", provider.value)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                config.llm_provider === provider.value
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-white text-foreground hover:bg-muted"
              }`}
            >
              {provider.label}
              {config.llm_provider === provider.value && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Model selector per provider */}
        {currentProvider?.models && currentProvider.models.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <label className="label text-xs mb-1">Modelo</label>
            <select
              value={config[currentProvider.modelKey as keyof AppConfig] as string || currentProvider.models[0].value}
              onChange={(e) => onUpdate(currentProvider.modelKey as keyof AppConfig, e.target.value as never)}
              className="select text-sm py-1.5"
            >
              {currentProvider.models.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* API Key Input */}
        {currentProvider?.needsKey && (
          <div className="mt-3 pt-3 border-t border-border">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Key className="w-3.5 h-3.5" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showKeys[config.llm_provider] ? "text" : "password"}
                value=""
                onChange={() => {}}
                placeholder={`API key de ${currentProvider.label}`}
                className="input pr-9 text-sm py-1.5"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility(config.llm_provider)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys[config.llm_provider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Base URL Input */}
        {currentProvider?.needsUrl && (
          <div className="mt-3 pt-3 border-t border-border">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Link className="w-3.5 h-3.5" />
              URL Base
            </label>
            <input
              type="text"
              value={config.ollama_url || defaultBaseUrls[config.llm_provider] || ""}
              onChange={(e) => onUpdate("ollama_url", e.target.value)}
              placeholder="https://api.ejemplo.com/v1"
              className="input text-sm py-1.5"
            />
            {config.llm_provider === "ollama" && (
              <p className="text-xs text-muted-foreground mt-1">
                Por defecto: http://localhost:11434
              </p>
            )}
            {config.llm_provider === "kimi" && (
              <p className="text-xs text-muted-foreground mt-1">
                Por defecto: https://api.moonshot.cn
              </p>
            )}
          </div>
        )}

        {config.llm_provider === "ollama" && !currentProvider?.needsKey && (
          <div className="mt-3 p-2 rounded-lg bg-success-light border border-success/20">
            <div className="flex items-center gap-1.5 text-xs text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Modo local activo
            </div>
          </div>
        )}
      </div>

      {/* Diarization */}
      <div className="card !p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="badge-primary text-xs">Diarización</span>
        </div>
        
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={config.diarize}
            onChange={(e) => onUpdate("diarize", e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <div>
            <span className="text-sm font-medium text-foreground">Identificar hablantes</span>
            <p className="text-xs text-muted-foreground mt-0.5">Requiere whisperx</p>
          </div>
        </label>
      </div>
      </div>
    </div>
  );
}
