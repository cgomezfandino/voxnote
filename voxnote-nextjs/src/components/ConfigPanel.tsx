"use client";

import { useState } from "react";
import { Mic, Brain, Users, Key, Link, Eye, EyeOff } from "lucide-react";

interface ConfigPanelProps {
  whisperModel: string;
  setWhisperModel: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  llmProvider: string;
  setLlmProvider: (v: string) => void;
  diarizeEnabled: boolean;
  setDiarizeEnabled: (v: boolean) => void;
  // API Keys
  apiKeys: Record<string, string>;
  setApiKey: (provider: string, key: string) => void;
  // Base URLs
  baseUrls: Record<string, string>;
  setBaseUrl: (provider: string, url: string) => void;
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
  { value: "ollama", label: "Ollama (Local)", needsKey: false, needsUrl: true },
  { value: "openai", label: "OpenAI", needsKey: true, needsUrl: false },
  { value: "kimi", label: "Kimi (Moonshot)", needsKey: true, needsUrl: true },
  { value: "glm", label: "GLM", needsKey: true, needsUrl: true },
  { value: "google", label: "Google", needsKey: true, needsUrl: false },
];

const defaultBaseUrls: Record<string, string> = {
  ollama: "http://localhost:11434",
  glm: "https://api.z.ai/api/coding/paas/v4",
  kimi: "https://api.moonshot.cn",
};

export default function ConfigPanel({
  whisperModel,
  setWhisperModel,
  language,
  setLanguage,
  llmProvider,
  setLlmProvider,
  diarizeEnabled,
  setDiarizeEnabled,
  apiKeys,
  setApiKey,
  baseUrls,
  setBaseUrl,
}: ConfigPanelProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
  const currentProvider = llmProviders.find(p => p.value === llmProvider);

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - Compact */}
      <div className="flex-shrink-0 mb-3">
        <h2 className="text-base font-semibold text-foreground">Configuración</h2>
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
              value={whisperModel}
              onChange={(e) => setWhisperModel(e.target.value)}
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
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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
              onClick={() => setLlmProvider(provider.value)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                llmProvider === provider.value
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-white text-foreground hover:bg-muted"
              }`}
            >
              {provider.label}
              {llmProvider === provider.value && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* API Key Input */}
        {currentProvider?.needsKey && (
          <div className="mt-3 pt-3 border-t border-border">
            <label className="label text-xs flex items-center gap-1.5 mb-1.5">
              <Key className="w-3.5 h-3.5" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showKeys[llmProvider] ? "text" : "password"}
                value={apiKeys[llmProvider] || ""}
                onChange={(e) => setApiKey(llmProvider, e.target.value)}
                placeholder={`API key de ${currentProvider.label}`}
                className="input pr-9 text-sm py-1.5"
              />
              <button
                type="button"
                onClick={() => toggleKeyVisibility(llmProvider)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys[llmProvider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
              value={baseUrls[llmProvider] || defaultBaseUrls[llmProvider] || ""}
              onChange={(e) => setBaseUrl(llmProvider, e.target.value)}
              placeholder="https://api.ejemplo.com/v1"
              className="input text-sm py-1.5"
            />
            {llmProvider === "ollama" && (
              <p className="text-xs text-muted-foreground mt-1">
                Por defecto: http://localhost:11434
              </p>
            )}
            {llmProvider === "kimi" && (
              <p className="text-xs text-muted-foreground mt-1">
                Por defecto: https://api.moonshot.cn
              </p>
            )}
          </div>
        )}
        
        {llmProvider === "ollama" && !currentProvider?.needsKey && (
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
            checked={diarizeEnabled}
            onChange={(e) => setDiarizeEnabled(e.target.checked)}
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
