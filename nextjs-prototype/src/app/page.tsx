"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import ConfigSidebar from "@/components/ConfigSidebar";
import AudioRecorder from "@/components/AudioRecorder";
import AudioVisualizer from "@/components/AudioVisualizer";
import ProcessingSteps from "@/components/ProcessingSteps";
import type { Step } from "@/components/ProcessingSteps";
import { Mic, FileAudio, History, CheckCircle } from "lucide-react";

type Tab = "record" | "process" | "history";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [whisperModel, setWhisperModel] = useState("turbo");
  const [language, setLanguage] = useState("es");
  const [llmProvider, setLlmProvider] = useState("ollama");
  const [diarizeEnabled, setDiarizeEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, title: "Transcribiendo con Whisper...", status: "pending" },
    { id: 2, title: "Extrayendo insights con IA...", status: "pending" },
    { id: 3, title: "Generando nota Obsidian...", status: "pending" },
  ]);

  const handleRecordingComplete = (blob: Blob) => {
    console.log("Recording completed:", blob);
    // Aquí se enviaría al backend Python
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setSteps([
      { id: 1, title: "Transcribiendo con Whisper...", status: "active" },
      { id: 2, title: "Extrayendo insights con IA...", status: "pending" },
      { id: 3, title: "Generando nota Obsidian...", status: "pending" },
    ]);

    // Simulate steps
    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 1
            ? { ...s, status: "completed", description: "✓ 2,450 caracteres" }
            : s.id === 2
            ? { ...s, status: "active" }
            : s
        )
      );
    }, 2000);

    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 2
            ? { ...s, status: "completed", description: "✓ Resumen generado" }
            : s.id === 3
            ? { ...s, status: "active" }
            : s
        )
      );
    }, 4000);

    setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 3
            ? { ...s, status: "completed", description: "✓ meeting_2024.md" }
            : s
        )
      );
      setIsProcessing(false);
    }, 5500);
  };

  const tabs = [
    { id: "record" as Tab, label: "Grabar", icon: Mic },
    { id: "process" as Tab, label: "Procesar", icon: FileAudio },
    { id: "history" as Tab, label: "Historial", icon: History },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 p-6 border-r border-white/[0.08] bg-gradient-to-b from-cyber-elevated to-cyber-bg overflow-y-auto">
        <ConfigSidebar
          whisperModel={whisperModel}
          setWhisperModel={setWhisperModel}
          language={language}
          setLanguage={setLanguage}
          llmProvider={llmProvider}
          setLlmProvider={setLlmProvider}
          diarizeEnabled={diarizeEnabled}
          setDiarizeEnabled={setDiarizeEnabled}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        <Header
          title="Voxnote"
          subtitle="Transcripción inteligente con IA local"
        />

        {/* Tabs */}
        <div className="tab-list mb-8 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab flex items-center gap-2 ${
                  activeTab === tab.id ? "tab-active" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "record" && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl"
            >
              <h2 className="text-2xl font-heading font-semibold mb-2 text-white">
                🎙️ Grabar Reunión
              </h2>
              <p className="text-muted mb-6">
                Captura audio desde tu micrófono y conviértelo en notas
                estructuradas
              </p>

              <AudioRecorder onRecordingComplete={handleRecordingComplete} />

              {/* Demo: Processing Steps */}
              <div className="mt-8">
                <button
                  onClick={simulateProcessing}
                  disabled={isProcessing}
                  className="btn-gradient mb-6 disabled:opacity-50"
                >
                  {isProcessing ? "Procesando..." : "▶ Simular Procesamiento"}
                </button>

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ProcessingSteps steps={steps} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "process" && (
            <motion.div
              key="process"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl"
            >
              <h2 className="text-2xl font-heading font-semibold mb-2 text-white">
                📄 Procesar Archivo
              </h2>
              <p className="text-muted mb-6">
                Sube un archivo de audio existente para transcribir y analizar
              </p>

              {/* Demo Audio Visualizer */}
              <AudioVisualizer
                audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                fileName="demo_audio.mp3"
              />
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-2xl font-heading font-semibold mb-2 text-white">
                📊 Historial
              </h2>
              <p className="text-muted mb-6">
                Tus notas generadas recientemente
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass-card text-center">
                  <div className="text-3xl font-display font-bold text-gradient">
                    24
                  </div>
                  <div className="text-sm text-muted mt-1">Notas totales</div>
                </div>
                <div className="glass-card text-center">
                  <div className="text-3xl font-display font-bold text-secondary">
                    3
                  </div>
                  <div className="text-sm text-muted mt-1">Hoy</div>
                </div>
                <div className="glass-card text-center">
                  <div className="text-3xl font-display font-bold text-accent-alt">
                    12
                  </div>
                  <div className="text-sm text-muted mt-1">Esta semana</div>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {[
                  {
                    name: "reunion_equipo_2024-02-12.md",
                    date: "12/02/2024 14:30",
                    preview: "# Resumen\n\nSe discutieron los objetivos...",
                  },
                  {
                    name: "ll cliente_acme.md",
                    date: "11/02/2024 10:15",
                    preview: "# Resumen\n\nReunión con el cliente...",
                  },
                  {
                    name: "daily_standup.md",
                    date: "10/02/2024 09:00",
                    preview: "# Resumen\n\nDaily standup del equipo...",
                  },
                ].map((note, i) => (
                  <motion.div
                    key={note.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card-sm cursor-pointer hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-heading font-medium text-white flex items-center gap-2">
                          📝 {note.name}
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </h4>
                        <p className="text-sm text-muted mt-1">{note.date}</p>
                      </div>
                      <button className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] text-muted hover:text-white transition-colors">
                        Ver nota
                      </button>
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-black/20 text-sm text-muted font-mono line-clamp-2">
                      {note.preview}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
