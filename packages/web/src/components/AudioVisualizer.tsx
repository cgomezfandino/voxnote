"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Download, Volume2 } from "lucide-react";

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
    
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime("0:00");
    setDuration("0:00");

    const rootStyle = getComputedStyle(document.documentElement);
    const waveColor = rootStyle.getPropertyValue("--muted-foreground").trim();
    const progressColor = rootStyle.getPropertyValue("--accent").trim();
    const cursorColor = rootStyle.getPropertyValue("--primary").trim();

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,         // De-emphasized unplayed wave (theme-aware)
      progressColor,     // Resolved accent token (visible in light + dark)
      cursorColor,       // Resolved primary token
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
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
    
    ws.on("error", (err) => {
      console.warn("WaveSurfer error:", err);
      setIsReady(false);
    });

    if (audioUrl && audioUrl.trim() !== "") {
      ws.load(audioUrl).catch((err) => {
        console.warn("Failed to load audio:", err);
        setIsReady(false);
      });
    }

    return () => {
      ws.unAll();
      try {
        ws.destroy();
      } catch {
        // Ignore
      }
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
    <div className="card border border-border relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5 relative z-10">
        <div className="w-11 h-11 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Volume2 className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{isReady ? "Audio Loaded" : "Analyzing audio..."}</h3>
          <p className="text-xs text-muted-foreground">{isReady ? "Frequency visualization ready" : "Preparing player..."}</p>
        </div>
      </div>

      {/* Waveform Canvas Div */}
      <div ref={containerRef} className="mb-4 relative z-10 filter drop-shadow-[0_2px_8px_rgba(52,211,153,0.15)]" />

      {/* Control Actions Deck */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 transition-all flex-shrink-0 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          
          <span className="text-xs text-muted-foreground font-mono bg-muted border border-border px-2.5 py-1 rounded-md tabular-nums">
            {currentTime} / {duration}
          </span>
        </div>

        <button
          onClick={downloadAudio}
          className="p-2 rounded-lg bg-muted border border-border hover:bg-foreground/[0.04] transition-colors self-start sm:self-auto"
          title="Download audio file"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
