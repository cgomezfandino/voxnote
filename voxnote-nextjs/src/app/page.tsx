"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, FileAudio, History, Menu, X, Upload } from "lucide-react";
import ConfigPanel from "@/components/ConfigPanel";
import AudioRecorder from "@/components/AudioRecorder";
import AudioVisualizer from "@/components/AudioVisualizer";
import Logo from "@/components/Logo";
import type { ProcessingStep } from "@/types";

type Tab = "record" | "process" | "history";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Whisper config
  const [whisperModel, setWhisperModel] = useState("turbo");
  const [language, setLanguage] = useState("es");
  
  // LLM config
  const [llmProvider, setLlmProvider] = useState("ollama");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({
    ollama: "http://localhost:11434",
    glm: "https://api.z.ai/api/coding/paas/v4",
    kimi: "https://api.moonshot.cn",
  });
  
  // Diarization
  const [diarizeEnabled, setDiarizeEnabled] = useState(true);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  
  // Recording state - persisted across tabs
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  
  const handleRecordingComplete = (blob: Blob, duration: number) => {
    const url = URL.createObjectURL(blob);
    setRecordedBlob(blob);
    setRecordedUrl(url);
    setRecordedDuration(duration);
  };
  
  const handleResetRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordedDuration(0);
  };

  const handleSetApiKey = (provider: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const handleSetBaseUrl = (provider: string, url: string) => {
    setBaseUrls(prev => ({ ...prev, [provider]: url }));
  };

  const tabs = [
    { id: "record" as Tab, label: "Grabar", icon: Mic },
    { id: "process" as Tab, label: "Procesar", icon: FileAudio },
    { id: "history" as Tab, label: "Historial", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-center p-4 border-b border-border bg-white sticky top-0 z-40 relative">
        <div className="flex items-center gap-3">
          <Logo size="md" animated />
          <h1 className="text-xl font-bold text-foreground">Voxnote</h1>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors absolute right-4"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop: sticky full height, Mobile: conditional */}
        <aside className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-30
          w-80 h-screen bg-white border-r border-border p-5
          transform transition-transform duration-300 ease-in-out
          lg:transform-none overflow-hidden flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <ConfigPanel
            whisperModel={whisperModel}
            setWhisperModel={setWhisperModel}
            language={language}
            setLanguage={setLanguage}
            llmProvider={llmProvider}
            setLlmProvider={setLlmProvider}
            diarizeEnabled={diarizeEnabled}
            setDiarizeEnabled={setDiarizeEnabled}
            apiKeys={apiKeys}
            setApiKey={handleSetApiKey}
            baseUrls={baseUrls}
            setBaseUrl={handleSetBaseUrl}
          />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen flex flex-col">
          {/* Desktop Header */}
          <header className="hidden lg:block p-6 lg:p-8 pb-0 flex-shrink-0">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-4">
                <Logo size="lg" animated />
                <div className="text-left">
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Voxnote</h1>
                  <p className="text-muted-foreground text-sm">Transcripción inteligente con IA</p>
                </div>
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="px-4 lg:px-8 pt-6 pb-4 lg:pt-10 lg:pb-6 flex-shrink-0">
            <div className="max-w-5xl mx-auto flex justify-center">
              <div className="flex gap-1 p-1 bg-muted rounded-xl">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 lg:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? "bg-white text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content - Centered vertically */}
          <div className="flex-1 px-4 lg:px-8 pb-8 flex flex-col justify-center">
            <div className="max-w-5xl mx-auto w-full">
              <AnimatePresence mode="wait">
                {activeTab === "record" && (
                  <motion.div
                    key="record"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Grabar reunión</h2>
                      <p className="text-muted-foreground">Captura audio y conviértelo en notas estructuradas</p>
                    </div>
                    
                    <div className="max-w-2xl mx-auto">
                      <AudioRecorder 
                        onRecordingComplete={handleRecordingComplete}
                        initialBlob={recordedBlob}
                        initialUrl={recordedUrl}
                        initialDuration={recordedDuration}
                        onReset={handleResetRecording}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === "process" && (
                  <motion.div
                    key="process"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Procesar archivo</h2>
                      <p className="text-muted-foreground">
                        {recordedUrl 
                          ? "Revisa tu grabación antes de procesarla" 
                          : "Sube un audio existente para transcribir"}
                      </p>
                    </div>
                    
                    <div className="max-w-3xl mx-auto">
                      {recordedUrl ? (
                        <AudioVisualizer 
                          audioUrl={recordedUrl}
                          fileName="grabacion.wav"
                        />
                      ) : (
                        <div className="card border-2 border-dashed border-border p-12 text-center">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <FileAudio className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">No hay audio para procesar</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Graba un audio primero o sube un archivo existente
                          </p>
                          <button 
                            onClick={() => setActiveTab("record")}
                            className="btn-primary"
                          >
                            Ir a Grabar
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Historial</h2>
                      <p className="text-muted-foreground">Tus notas generadas</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      <div className="card text-center">
                        <div className="text-3xl font-bold text-primary">24</div>
                        <div className="text-sm text-muted-foreground mt-1">Notas totales</div>
                      </div>
                      <div className="card text-center">
                        <div className="text-3xl font-bold text-accent">3</div>
                        <div className="text-sm text-muted-foreground mt-1">Hoy</div>
                      </div>
                      <div className="card text-center sm:col-span-2 lg:col-span-1">
                        <div className="text-3xl font-bold text-success">12</div>
                        <div className="text-sm text-muted-foreground mt-1">Esta semana</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
