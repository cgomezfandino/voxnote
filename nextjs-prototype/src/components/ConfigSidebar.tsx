"use client";

import { motion } from "framer-motion";
import { Settings, Mic, Brain, Users } from "lucide-react";

interface ConfigSidebarProps {
  whisperModel: string;
  setWhisperModel: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  llmProvider: string;
  setLlmProvider: (value: string) => void;
  diarizeEnabled: boolean;
  setDiarizeEnabled: (value: boolean) => void;
}

const whisperModels = [
  { value: "tiny", label: "Tiny - Rápido", desc: "Menor precisión" },
  { value: "base", label: "Base", desc: "Balance básico" },
  { value: "small", label: "Small", desc: "Buena precisión" },
  { value: "medium", label: "Medium", desc: "Alta precisión" },
  { value: "turbo", label: "Turbo ⚡", desc: "Recomendado" },
  { value: "large-v3", label: "Large-v3", desc: "Máxima precisión" },
];

const llmProviders = [
  { value: "ollama", label: "Ollama (Local)", icon: "🏠" },
  { value: "openai", label: "OpenAI", icon: "🌐" },
  { value: "kimi", label: "Kimi", icon: "🌙" },
  { value: "glm", label: "GLM", icon: "🧠" },
  { value: "google", label: "Google", icon: "🔍" },
];

export default function ConfigSidebar({
  whisperModel,
  setWhisperModel,
  language,
  setLanguage,
  llmProvider,
  setLlmProvider,
  diarizeEnabled,
  setDiarizeEnabled,
}: ConfigSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full"
    >
      <div className="sticky top-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-display text-xl text-primary-light flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración
          </h2>
          <p className="text-sm text-muted mt-1">
            Personaliza tu experiencia
          </p>
        </div>

        {/* Whisper Config */}
        <div className="glass-card-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge-primary flex items-center gap-1.5">
              <Mic className="w-3 h-3" />
              Whisper
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Modelo
              </label>
              <select
                value={whisperModel}
                onChange={(e) => setWhisperModel(e.target.value)}
                className="select-cyber"
              >
                {whisperModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1.5">
                {whisperModels.find((m) => m.value === whisperModel)?.desc}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Idioma
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="es, en, fr..."
                className="input-cyber"
              />
              <p className="text-xs text-muted mt-1.5">
                Código ISO (vacío = auto-detectar)
              </p>
            </div>
          </div>
        </div>

        {/* LLM Provider Config */}
        <div className="glass-card-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge badge-accent flex items-center gap-1.5">
              <Brain className="w-3 h-3" />
              LLM Provider
            </span>
          </div>

          <div className="space-y-3">
            {llmProviders.map((provider) => (
              <motion.button
                key={provider.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLlmProvider(provider.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  llmProvider === provider.value
                    ? "bg-gradient-primary border-transparent text-white"
                    : "bg-white/[0.02] border-white/[0.08] text-muted hover:text-white hover:border-white/[0.12]"
                }`}
              >
                <span className="text-lg">{provider.icon}</span>
                <span className="font-medium">{provider.label}</span>
                {llmProvider === provider.value && (
                  <motion.div
                    layoutId="activeProvider"
                    className="ml-auto w-2 h-2 rounded-full bg-white"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {llmProvider === "ollama" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/30"
            >
              <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Modo Local Activo
              </div>
              <div className="text-sm text-muted">
                Usando llama3.1:8b localmente
              </div>
            </motion.div>
          )}
        </div>

        {/* Diarization Config */}
        <div className="glass-card-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge badge-success flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Diarización
            </span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={diarizeEnabled}
                onChange={(e) => setDiarizeEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 rounded border border-white/[0.12] bg-white/[0.02] peer-checked:bg-gradient-primary peer-checked:border-transparent transition-all" />
              <svg
                className="absolute inset-0 w-5 h-5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M5 10L8 13L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <span className="text-white font-medium group-hover:text-primary-light transition-colors">
                Identificar hablantes
              </span>
              <p className="text-xs text-muted mt-0.5">
                Requiere whisperx y HuggingFace token
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <div className="text-xs text-muted mb-1">📁 Directorio de salida</div>
          <code className="text-sm text-muted-foreground font-mono">
            ./output/
          </code>
        </div>
      </div>
    </motion.aside>
  );
}
