"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, RefreshCw, Play, Pause } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export default function AudioRecorder({
  onRecordingComplete,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizerData, setVisualizerData] = useState<number[]>(
    Array(30).fill(5)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars = Array.from({ length: 30 }, (_, i) => {
          const index = Math.floor((i / 30) * dataArray.length);
          return (dataArray[index] / 255) * 40 + 5;
        });

        setVisualizerData(bars);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) =>
        track.stop()
      );
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setVisualizerData(Array(30).fill(5));
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hasRecording = audioUrl && !isRecording;

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <motion.div
        layout
        className={`glass-card p-8 text-center transition-all duration-500 ${
          isRecording
            ? "border-accent/50 shadow-[0_0_40px_rgba(251,113,133,0.3)]"
            : ""
        }`}
      >
        {/* Visualizer Bars - Solo durante grabación o cuando hay grabación */}
        <div className="flex items-center justify-center gap-1 h-24 mb-6">
          {visualizerData.map((height, i) => (
            <motion.div
              key={i}
              animate={{
                height: isRecording ? height : hasRecording ? 10 : 10,
                backgroundColor: isRecording ? "#FB7185" : "#9F7AEA",
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: i * 0.01,
              }}
              className="w-2 rounded-full"
              style={{ minHeight: 4 }}
            />
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mb-6"
            >
              <div className="text-4xl font-display font-bold text-accent tabular-nums">
                {formatTime(recordingTime)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-accent">Grabando...</span>
              </div>
            </motion.div>
          ) : hasRecording ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 space-y-4"
            >
              {/* Success Message */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <span className="text-emerald-400 text-xl">✓</span>
                </div>
                <div className="text-left">
                  <div className="text-lg font-display font-bold text-emerald-400">
                    Grabación completada
                  </div>
                  <div className="text-sm text-muted">
                    Duración: {formatTime(recordingTime)}
                  </div>
                </div>
              </div>

              {/* Audio Player Inline */}
              <div className="bg-black/30 rounded-xl p-4 mx-auto max-w-md">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white transition-transform hover:scale-105"
                    style={{ boxShadow: "0 4px 20px rgba(159, 122, 234, 0.4)" }}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  
                  <span className="text-sm text-muted font-mono">
                    Escuchar grabación
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <div className="text-xl text-muted">
                Presiona el botón para comenzar
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Estado: IDLE (no grabando, no hay audio) */}
          {!isRecording && !hasRecording && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              className="btn-action flex items-center gap-3"
              animate={{
                boxShadow: [
                  "0 4px 20px rgba(251, 113, 133, 0.4)",
                  "0 4px 30px rgba(251, 113, 133, 0.6)",
                  "0 4px 20px rgba(251, 113, 133, 0.4)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Mic className="w-5 h-5" />
              Iniciar Grabación
            </motion.button>
          )}

          {/* Estado: RECORDING */}
          {isRecording && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-heading font-semibold text-lg"
              style={{ boxShadow: "0 4px 20px rgba(239, 68, 68, 0.4)" }}
            >
              <Square className="w-5 h-5 fill-current" />
              Detener
            </motion.button>
          )}

          {/* Estado: COMPLETED (hay grabación) */}
          {hasRecording && (
            <>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-muted hover:text-white hover:border-white/[0.12] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Regrabar
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-gradient flex items-center gap-2"
              >
                🚀 Procesar Ahora
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
