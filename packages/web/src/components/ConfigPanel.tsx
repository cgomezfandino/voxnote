"use client";

import { useState, useEffect } from "react";
import { Mic, Brain, Users, Link } from "lucide-react";

import type { AppConfig } from "@/types";
import { listOllamaModels, type OllamaModel } from "@/lib/api";

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
      { value: "gemma4:31b-cloud", label: "Gemma 4 31B (Cloud)" },
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
];

const defaultBaseUrls: Record<string, string> = {
  ollama: "http://localhost:11434",
};

export default function ConfigPanel({
  config,
  onUpdate,
  isSyncing,
}: ConfigPanelProps) {
  const currentProvider = llmProviders.find(p => p.value === config.llm_provider);
  const [dynamicOllamaModels, setDynamicOllamaModels] = useState<any[]>([]);

  useEffect(() => {
    if (config.llm_provider === "ollama") {
      listOllamaModels()
        .then((models) => {
          setDynamicOllamaModels(models);
        })
        .catch(() => setDynamicOllamaModels([]));
    }
  }, [config.llm_provider]);

  useEffect(() => {
    if (config.llm_provider === "ollama" && dynamicOllamaModels.length > 0) {
      const currentModelExists = dynamicOllamaModels.some((m) => m.value === config.ollama_model);
      if (!currentModelExists) {
        // @ts-ignore - we know ollama_model is a valid key
        onUpdate("ollama_model", dynamicOllamaModels[0].value);
      }
    }
  }, [config.llm_provider, config.ollama_model, dynamicOllamaModels, onUpdate]);

  let modelsToDisplay = currentProvider?.models || [];
  if (currentProvider?.value === "ollama" && dynamicOllamaModels.length > 0) {
    modelsToDisplay = dynamicOllamaModels;
  }

  let selectedModel = "";
  if (currentProvider && currentProvider.modelKey) {
    selectedModel = config[currentProvider.modelKey as keyof AppConfig] as string;
  }
  if (!selectedModel && modelsToDisplay.length > 0) {
    selectedModel = modelsToDisplay[0].value;
  }

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
        
        <div className="space-y-3">
          <div>
            <label className="label text-xs mb-1">Proveedor</label>
            <select
              value={config.llm_provider}
              onChange={(e) => onUpdate("llm_provider", e.target.value)}
              className="select text-sm py-1.5"
            >
              {llmProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>{provider.label}</option>
              ))}
            </select>
          </div>

          {/* Model selector per provider */}
          {modelsToDisplay.length > 0 && (
            <div className="pt-3 border-t border-border">
              <label className="label text-xs mb-1">Modelo</label>
              <select
                value={selectedModel}
                onChange={(e) => onUpdate(currentProvider!.modelKey as keyof AppConfig, e.target.value as never)}
                className="select text-sm py-1.5"
              >
                {modelsToDisplay.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Base URL Input */}
          {currentProvider?.needsUrl && (
            <div className="pt-3 border-t border-border space-y-3">
              <div>
                <label className="label text-xs flex items-center gap-1.5 mb-1.5">
                  <Link className="w-3.5 h-3.5" />
                  URL Base
                </label>
                <input
                  type="text"
                  value={config.ollama_url || defaultBaseUrls[config.llm_provider] || ""}
                  onChange={(e) => onUpdate("ollama_url", e.target.value)}
                  placeholder="http://localhost:11434"
                  className="input text-sm py-1.5"
                />
                {config.llm_provider === "ollama" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Por defecto: http://localhost:11434
                  </p>
                )}
              </div>

              <div>
                <label className="label text-xs flex items-center gap-1.5 mb-1.5">
                  Token / API Key (Cloud)
                </label>
                <input
                  type="password"
                  value={config.ollama_api_key || ""}
                  onChange={(e) => onUpdate("ollama_api_key", e.target.value)}
                  placeholder="Bearer token o API key (opcional)"
                  className="input text-sm py-1.5"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Opcional. Para endpoints de Ollama que requieran autenticación.
                </p>
              </div>
            </div>
          )}

          {config.llm_provider === "ollama" && (
            <div className="pt-2">
              <div className="p-2 rounded-lg bg-success-light border border-success/20">
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Modo local activo
                </div>
              </div>
            </div>
          )}
        </div>
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
