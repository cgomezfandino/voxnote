"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Download } from "lucide-react";

interface AudioVisualizerProps {
  audioUrl: string;
  fileName?: string;
}

export default function AudioVisualizer({
  audioUrl,
  fileName = "audio.wav",
}: AudioVisualizerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [volume, setVolume] = useState(1);
  const [isReady, setIsReady] = useState(false);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!waveformRef.current) return;

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "rgba(159, 122, 234, 0.4)",
      progressColor: "#9F7AEA",
      cursorColor: "#22D3EE",
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      height: 80,
      normalize: true,
      backend: "WebAudio",
    });

    wavesurfer.current = ws;

    // Event listeners
    ws.on("ready", () => {
      setIsReady(true);
      setDuration(formatTime(ws.getDuration()));
    });

    ws.on("audioprocess", () => {
      setCurrentTime(formatTime(ws.getCurrentTime()));
    });

    ws.on("finish", () => {
      setIsPlaying(false);
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));

    // Load audio
    ws.load(audioUrl);

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    wavesurfer.current?.playPause();
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    wavesurfer.current?.setVolume(newVolume);
  };

  const downloadAudio = () => {
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center"
        >
          <span className="text-lg">🎵</span>
        </motion.div>
        <div>
          <h3 className="font-heading font-semibold text-white">
            {isReady ? "Audio listo" : "Cargando audio..."}
          </h3>
          <p className="text-sm text-muted">
            {isReady ? "Reproduce para verificar" : "Procesando waveform..."}
          </p>
        </div>
      </div>

      {/* Waveform */}
      <div
        ref={waveformRef}
        className="w-full mb-4 rounded-xl overflow-hidden bg-black/30"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            disabled={!isReady}
            className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ boxShadow: "0 4px 20px rgba(159, 122, 234, 0.4)" }}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </motion.button>

          {/* Time Display */}
          <div className="font-mono text-sm text-muted tabular-nums">
            <span className={isPlaying ? "text-secondary" : ""}>
              {currentTime}
            </span>
            <span className="mx-1">/</span>
            <span>{duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Download Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadAudio}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted hover:text-white hover:border-primary/50 transition-all"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
