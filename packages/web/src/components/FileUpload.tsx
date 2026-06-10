"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileAudio, X } from "lucide-react";

const ACCEPTED_TYPES = [
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
];

const ACCEPTED_EXTENSIONS = ".wav,.mp3,.m4a,.ogg,.flac,.webm,.mp4";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (
        ACCEPTED_TYPES.includes(file.type) ||
        /\.(wav|mp3|m4a|ogg|flac|webm|mp4)$/i.test(file.name)
      ) {
        setSelectedFile(file);
        onFileSelected(file);
      } else {
        alert("Formato no soportado. Usa WAV, MP3, M4A, OGG, FLAC o WebM.");
      }
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragActive(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedFile) {
    return (
      <div className="card border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <FileAudio className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-200 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatSize(selectedFile.size)}
            </p>
          </div>
          <button
            onClick={clearFile}
            disabled={disabled}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`card border-2 border-dashed cursor-pointer transition-all ${
        dragActive
          ? "border-primary bg-primary/10"
          : "border-white/10 hover:border-primary/40 hover:bg-slate-900/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="py-6 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-950/40 border border-white/5 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground mb-1">
          {dragActive ? "Suelta el archivo aquí" : "Sube un archivo de audio"}
        </p>
        <p className="text-xs text-muted-foreground">
          WAV, MP3, M4A, OGG, FLAC o WebM (Máximo 25MB recomendado)
        </p>
      </div>
    </div>
  );
}
