"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  FileAudio,
  History,
  Menu,
  X,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import ConfigPanel from "@/components/ConfigPanel";
import AudioRecorder from "@/components/AudioRecorder";
import AudioVisualizer from "@/components/AudioVisualizer";
import FileUpload from "@/components/FileUpload";
import ProcessingSteps from "@/components/ProcessingSteps";
import InsightsDisplay from "@/components/InsightsDisplay";
import NotePreview from "@/components/NotePreview";
import Logo from "@/components/Logo";
import { useVoxnote } from "@/hooks/useVoxnote";
import { useConfig } from "@/hooks/useConfig";
import { listNotes, getNote } from "@/lib/api";
import type { InsightsResult, NoteListItem } from "@/types";

type Tab = "record" | "process" | "history";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("voxnote-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Mirror the theme onto <html> so the document background (visible behind the app shell
  // and any transparent content) follows the theme — otherwise <body> keeps the :root
  // (dark) --background and shows through as a dark area in light mode.
  useEffect(() => {
    document.documentElement.classList.toggle("light-theme", theme === "light");
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("voxnote-theme", nextTheme);
  };

  // Config from backend
  const { config, updateField, isSyncing, isLoaded } = useConfig();

  // Pipeline hook
  const { processAudio, steps, isLoading, error, reset } = useVoxnote();

  // Recording state - persisted across tabs
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  // Processing results
  const [processedInsights, setProcessedInsights] = useState<InsightsResult | null>(null);
  const [processedNote, setProcessedNote] = useState<{
    content: string;
    filename: string;
  } | null>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // History state
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<{
    content: string;
    filename: string;
  } | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);

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
    setUploadedFile(null);
    setProcessedInsights(null);
    setProcessedNote(null);
    reset();
  };

  const handleFileSelected = useCallback((file: File) => {
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(url);
    setRecordedDuration(0);
    setProcessedInsights(null);
    setProcessedNote(null);
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const handleProcess = useCallback(async () => {
    const audioBlob = uploadedFile || recordedBlob;
    if (!audioBlob) return;

    setProcessedInsights(null);
    setProcessedNote(null);

    try {
      const result = await processAudio(audioBlob, {
        model: config.whisper_model,
        language: config.language,
        diarize: config.diarize,
        provider: config.llm_provider,
        audioFilename: uploadedFile?.name || "grabacion.wav",
      });

      setProcessedInsights(result.insights);
      setProcessedNote({
        content: result.note.content,
        filename: result.note.filename,
      });
    } catch {
      // Error already handled by hook
    }
  }, [uploadedFile, recordedBlob, processAudio, config]);

  // Fetch notes when History tab is activated
  useEffect(() => {
    if (activeTab === "history") {
      setLoadingNotes(true);
      listNotes()
        .then(setNotes)
        .catch(() => setNotes([]))
        .finally(() => setLoadingNotes(false));
    }
  }, [activeTab]);

  const handleViewNote = useCallback(
    async (filename: string) => {
      // Accordion (single-open): clicking the open note collapses it; clicking another
      // switches to it (the previous one closes automatically).
      if (selectedNote?.filename === filename) {
        setSelectedNote(null);
        return;
      }
      try {
        const note = await getNote(filename);
        setSelectedNote({ content: note.content, filename: note.filename });
      } catch {
        // silently fail
      }
    },
    [selectedNote]
  );

  const hasAudio = !!(recordedUrl || uploadedFile);
  const canProcess = hasAudio && !isLoading;

  const tabs = [
    { id: "record" as Tab, label: "Grabar", icon: Mic },
    { id: "process" as Tab, label: "Procesar", icon: FileAudio },
    { id: "history" as Tab, label: "Historial", icon: History },
  ];

  // Stats for history
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const notesToday = notes.filter((n) => n.created_at >= today).length;
  const notesThisWeek = notes.filter((n) => n.created_at >= weekAgo).length;

  return (
    <div className={`min-h-screen bg-background relative overflow-hidden transition-colors duration-300 ${theme === "light" ? "light-theme" : ""}`}>
      {/* Dynamic glow decoration background line */}
      {theme === "dark" && <div className="bg-glow-line top-0 left-0" />}

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--header-border)] bg-[var(--header-bg)]/80 backdrop-blur-md sticky top-0 z-40 relative">
        <div className="flex items-center gap-3">
          <Logo size="sm" animated />
          <h1 className={`text-lg font-bold tracking-tight ${
            theme === "dark"
              ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400"
              : "text-foreground"
          }`}>
            Voxnote
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-lg hover:bg-foreground/[0.04] transition-colors text-muted-foreground hover:text-foreground"
            title="Cambiar tema"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-primary" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-foreground/[0.04] transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-30
          w-80 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] p-5
          transform transition-transform duration-300 ease-in-out
          lg:transform-none overflow-hidden flex flex-col backdrop-blur-md
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <ConfigPanel
            config={config}
            onUpdate={updateField}
            isSyncing={isSyncing}
          />
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen flex flex-col relative">
          {/* Desktop Header */}
          <header className="hidden lg:block p-6 lg:p-8 pb-0 flex-shrink-0">
            <div className="max-w-5xl mx-auto relative flex items-center justify-center min-h-[96px]">
              {/* Centered Brand Banner */}
              <div className="inline-flex items-center gap-5 bg-[var(--header-bg)] border border-[var(--header-border)] px-7 py-4 rounded-3xl shadow-[var(--header-shadow)]">
                <Logo size="lg" animated />
                <div className="text-left">
                  <h1 className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${
                    theme === "dark"
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300"
                      : "text-foreground"
                  }`}>
                    Voxnote
                  </h1>
                  <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mt-1">
                    Transcripción Inteligente de Voz
                  </p>
                </div>
              </div>

              {/* Absolute Right-floating Theme Toggle Button */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <button 
                  onClick={handleToggleTheme}
                  className="p-3 rounded-2xl bg-[var(--header-bg)] border border-[var(--header-border)] hover:bg-foreground/[0.04] transition-all shadow-sm text-foreground flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider"
                  title="Cambiar tema de color"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="w-4 h-4 text-accent" />
                      <span className="text-muted-foreground">Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Modo Oscuro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="px-4 lg:px-8 pt-6 pb-4 lg:pt-8 lg:pb-5 flex-shrink-0">
            <div className="max-w-5xl mx-auto flex justify-center">
              <div className="flex gap-1.5 p-1 bg-[var(--tabs-bg)] border border-[var(--tabs-border)] rounded-xl backdrop-blur-sm">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 lg:px-5.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] shadow-sm border border-[var(--tab-active-border)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border border-transparent"
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

          {/* Content */}
          <div className="flex-1 px-4 lg:px-8 pb-8">
            <div className="max-w-5xl mx-auto w-full">
              {!isLoaded ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                  Cargando configuración...
                </div>
              ) : (
              <>
                {/* ==================== RECORD TAB ==================== */}
                {activeTab === "record" && (
                  <motion.div
                    key="record"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">
                        Grabar reunion
                      </h2>
                      <p className="text-muted-foreground">
                        Captura audio y conviertelo en notas estructuradas
                      </p>
                    </div>

                    <div className="max-w-2xl mx-auto">
                      <AudioRecorder
                        onRecordingComplete={handleRecordingComplete}
                        initialBlob={recordedBlob}
                        initialUrl={recordedUrl}
                        initialDuration={recordedDuration}
                        onReset={handleResetRecording}
                        onProcess={() => {
                          setActiveTab("process");
                          setTimeout(handleProcess, 300);
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* ==================== PROCESS TAB ==================== */}
                {activeTab === "process" && (
                  <motion.div
                    key="process"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">
                        Procesar archivo
                      </h2>
                      <p className="text-muted-foreground">
                        {hasAudio
                          ? "Revisa tu audio y procesalo con IA"
                          : "Sube un audio existente para transcribir"}
                      </p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                      {/* Audio source: visualizer or upload */}
                      {recordedUrl ? (
                        <div className="space-y-4">
                          <AudioVisualizer
                            audioUrl={recordedUrl}
                            fileName={uploadedFile?.name || "grabacion.wav"}
                          />

                          {/* Process button */}
                          {!processedInsights && (
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={handleProcess}
                                disabled={!canProcess}
                                className="btn-primary gap-2 disabled:opacity-50"
                              >
                                <FileAudio className="w-4 h-4" />
                                {isLoading
                                  ? "Procesando..."
                                  : "Procesar con IA"}
                              </button>
                              <button
                                onClick={handleResetRecording}
                                disabled={isLoading}
                                className="btn-secondary gap-2 disabled:opacity-50"
                              >
                                Limpiar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <FileUpload
                          onFileSelected={handleFileSelected}
                          disabled={isLoading}
                        />
                      )}

                      {/* Error display */}
                      {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger-border">
                          <AlertCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-danger">{error}</p>
                        </div>
                      )}

                      {/* Processing steps */}
                      {steps.length > 0 && (
                        <ProcessingSteps
                          steps={steps}
                          onRetry={canProcess ? handleProcess : undefined}
                        />
                      )}

                      {/* Insights display */}
                      {processedInsights && (
                        <InsightsDisplay insights={processedInsights} />
                      )}

                      {/* Note preview */}
                      {processedNote && (
                        <NotePreview
                          key={processedNote.filename}
                          content={processedNote.content}
                          filename={processedNote.filename}
                        />
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ==================== HISTORY TAB ==================== */}
                {activeTab === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">
                        Historial
                      </h2>
                      <p className="text-muted-foreground">
                        Tus notas generadas
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      <div className="card text-center card-glow-indigo">
                        <div className="text-3xl font-extrabold text-primary drop-shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                          {notes.length}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">
                          Notas totales
                        </div>
                      </div>
                      <div className="card text-center card-glow-green">
                        <div className="text-3xl font-extrabold text-accent drop-shadow-[0_0_12px_rgba(0,242,152,0.3)]">
                          {notesToday}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">
                          Hoy
                        </div>
                      </div>
                      <div className="card text-center sm:col-span-2 lg:col-span-1 card-glow-green">
                        <div className="text-3xl font-extrabold text-accent drop-shadow-[0_0_12px_rgba(0,242,152,0.3)]">
                          {notesThisWeek}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">
                          Esta semana
                        </div>
                      </div>
                    </div>

                    {/* Notes list */}
                    {loadingNotes ? (
                      <div className="text-center py-12 text-muted-foreground text-xs font-semibold uppercase tracking-wider animate-pulse">
                        Cargando notas...
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="card text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <h3 className="font-bold text-foreground mb-2">
                          Sin notas todavía
                        </h3>
                        <p className="text-xs text-muted-foreground mb-6 max-w-xs mx-auto">
                          Procesa tu primer audio o sube un archivo para generar notas inteligentes
                        </p>
                        <button
                          onClick={() => setActiveTab("process")}
                          className="btn-primary gap-2"
                        >
                          Ir a Procesar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {notes.map((note) => {
                          const isOpen = selectedNote?.filename === note.filename;
                          return (
                            <div key={note.filename}>
                              <button
                                onClick={() => handleViewNote(note.filename)}
                                aria-expanded={isOpen}
                                className={`card w-full text-left transition-all duration-300 group ${
                                  isOpen
                                    ? "border-primary/40 bg-foreground/[0.03]"
                                    : "hover:border-primary/40 hover:bg-foreground/[0.04]"
                                }`}
                              >
                                <div className="flex items-start gap-3.5">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    <FileText className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground text-sm truncate transition-colors">
                                      {note.filename}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                      {note.preview}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded border border-border">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        {new Date(note.created_at).toLocaleDateString("es")}
                                      </span>
                                      <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded border border-border">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        {new Date(note.created_at).toLocaleTimeString("es", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronDown
                                    className={`w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform duration-300 ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              </button>
                              {isOpen && selectedNote && (
                                <div className="mt-3">
                                  <NotePreview
                                    key={selectedNote.filename}
                                    content={selectedNote.content}
                                    filename={selectedNote.filename}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
