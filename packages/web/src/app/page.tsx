"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const handleViewNote = useCallback(async (filename: string) => {
    try {
      const note = await getNote(filename);
      setSelectedNote({ content: note.content, filename: note.filename });
    } catch {
      // silently fail
    }
  }, []);

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
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-30
          w-80 h-screen bg-white border-r border-border p-5
          transform transition-transform duration-300 ease-in-out
          lg:transform-none overflow-hidden flex flex-col
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
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                    Voxnote
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Transcripcion inteligente con IA
                  </p>
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

          {/* Content */}
          <div className="flex-1 px-4 lg:px-8 pb-8">
            <div className="max-w-5xl mx-auto w-full">
              {!isLoaded ? (
                <div className="text-center py-20 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                  Cargando configuración...
                </div>
              ) : (
              <AnimatePresence mode="wait">
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
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                          <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-accent">{error}</p>
                        </div>
                      )}

                      {/* Processing steps */}
                      {steps.length > 0 && <ProcessingSteps steps={steps} />}

                      {/* Insights display */}
                      {processedInsights && (
                        <InsightsDisplay insights={processedInsights} />
                      )}

                      {/* Note preview */}
                      {processedNote && (
                        <NotePreview
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
                      <div className="card text-center">
                        <div className="text-3xl font-bold text-primary">
                          {notes.length}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Notas totales
                        </div>
                      </div>
                      <div className="card text-center">
                        <div className="text-3xl font-bold text-accent">
                          {notesToday}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Hoy
                        </div>
                      </div>
                      <div className="card text-center sm:col-span-2 lg:col-span-1">
                        <div className="text-3xl font-bold text-success">
                          {notesThisWeek}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Esta semana
                        </div>
                      </div>
                    </div>

                    {/* Notes list */}
                    {loadingNotes ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Cargando notas...
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="card text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">
                          Sin notas todavia
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Procesa tu primer audio para generar una nota
                        </p>
                        <button
                          onClick={() => setActiveTab("process")}
                          className="btn-primary"
                        >
                          Ir a Procesar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <button
                            key={note.filename}
                            onClick={() => handleViewNote(note.filename)}
                            className="card w-full text-left hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-sm truncate">
                                  {note.filename}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {note.preview}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(note.created_at).toLocaleDateString("es")}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(note.created_at).toLocaleTimeString("es", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Selected note preview */}
                    {selectedNote && (
                      <div className="mt-6">
                        <NotePreview
                          content={selectedNote.content}
                          filename={selectedNote.filename}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
