"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Download } from "lucide-react";

interface AudioVisualizerProps {
  audioUrl: string;
  fileName?: string;
}

export default function AudioVisualizer({ audioUrl, fileName = "audio.wav" }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#C7D2FE",
      progressColor: "#4F46E5",
      cursorColor: "#4F46E5",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
    });

    wavesurferRef.current = ws;

    ws.on("ready", () => {
      setIsReady(true);
      setDuration(formatTime(ws.getDuration()));
    });

    ws.on("audioprocess", () => {
      setCurrentTime(formatTime(ws.getCurrentTime()));
    });

    ws.on("finish", () => setIsPlaying(false));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));

    ws.load(audioUrl);

    return () => {
      // Cleanup: unsubscribe from events before destroying
      ws.unAll();
      // Use setTimeout to avoid race conditions during rapid unmounts
      setTimeout(() => {
        try {
          ws.destroy();
        } catch {
          // Ignore destroy errors (e.g., AbortError from fetch cancellation)
        }
      }, 0);
    };
  }, [audioUrl]);

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  const downloadAudio = () => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
          <span className="text-primary text-xl">🎵</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{isReady ? "Audio listo" : "Cargando..."}</h3>
          <p className="text-sm text-muted-foreground">{isReady ? "Reproduce para verificar" : "Procesando..."}</p>
        </div>
      </div>

      <div ref={containerRef} className="mb-4" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          
          <span className="text-sm text-muted-foreground font-mono tabular-nums">
            {currentTime} / {duration}
          </span>
        </div>

        <button
          onClick={downloadAudio}
          className="p-2 rounded-lg hover:bg-muted transition-colors self-start sm:self-auto"
          title="Descargar"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
