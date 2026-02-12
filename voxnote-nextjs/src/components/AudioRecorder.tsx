"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, RefreshCw, Play, Pause } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  initialBlob?: Blob | null;
  initialUrl?: string | null;
  initialDuration?: number;
  onReset?: () => void;
}

export default function AudioRecorder({ 
  onRecordingComplete, 
  initialBlob = null, 
  initialUrl = null, 
  initialDuration = 0,
  onReset 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(initialDuration);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(initialBlob);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(30).fill(4));

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
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        onRecordingComplete(blob, recordingTime);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      // Higher fftSize for better frequency resolution
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const bufferLength = analyser.frequencyBinCount;
      
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Map 20 bars to frequency ranges using log scale for better distribution
        const bars = Array.from({ length: 30 }, (_, i) => {
          // Use log scale to better distribute frequency data across bars
          // Skip very low frequencies (0-2) as they often have noise
          const start = Math.floor(bufferLength * Math.log2(2 + i) / Math.log2(22));
          const end = Math.floor(bufferLength * Math.log2(3 + i) / Math.log2(22));
          
          // Average the values in this frequency range
          let sum = 0;
          let count = 0;
          for (let j = start; j < end && j < bufferLength; j++) {
            sum += dataArray[j];
            count++;
          }
          const average = count > 0 ? sum / count : 0;
          
          // Scale to visual height (4px min, 48px max)
          return (average / 255) * 44 + 4;
        });
        
        setVisualizerData(bars);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();
    } catch (err) {
      alert("No se pudo acceder al micrófono");
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
    setVisualizerData(Array(20).fill(4));
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    if (audioUrl && audioUrl !== initialUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    onReset?.();
  }, [audioUrl, initialUrl, onReset]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  // Check if we have a recording (either from current session or initial props)
  const hasRecording = (audioUrl || initialUrl) && !isRecording;
  
  // Use current state's URL or initial URL for playback
  const playbackUrl = audioUrl || initialUrl;

  return (
    <div className="card">
      {/* Visualizer */}
      <div className="flex items-center justify-center gap-[2px] sm:gap-1 h-20 sm:h-24 mb-6 px-4">
        {visualizerData.map((height, i) => (
          <motion.div
            key={i}
            animate={{
              height: isRecording ? height : hasRecording ? 6 : 4,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: i * 0.005 }}
            className={`w-1 sm:w-1.5 rounded-full ${isRecording ? "bg-accent" : "bg-primary/30"}`}
          />
        ))}
      </div>

      {/* Status */}
      <div className="text-center mb-6">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="text-3xl sm:text-4xl font-semibold text-accent tabular-nums">
                {formatDuration(recordingTime)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-accent">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Grabando...
              </div>
            </motion.div>
          ) : hasRecording ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-success-light flex items-center justify-center">
                  <span className="text-success text-lg sm:text-xl">✓</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Grabación lista</div>
                  <div className="text-sm text-muted-foreground">{formatDuration(recordingTime)}</div>
                </div>
              </div>

              {/* Audio player */}
              <div className="bg-muted rounded-lg p-3 mx-auto max-w-xs">
                <audio ref={audioRef} src={playbackUrl || undefined} onEnded={() => setIsPlaying(false)} />
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <span className="text-sm text-muted-foreground">Escuchar</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground"
            >
              Presiona para comenzar a grabar
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {!isRecording && !hasRecording && (
          <button onClick={startRecording} className="btn-accent gap-2 w-full sm:w-auto">
            <Mic className="w-4 h-4" />
            Grabar
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
          >
            <Square className="w-4 h-4 fill-current" />
            Detener
          </button>
        )}

        {hasRecording && (
          <>
            <button onClick={resetRecording} className="btn-secondary gap-2 w-full sm:w-auto">
              <RefreshCw className="w-4 h-4" />
              Regrabar
            </button>
            <button className="btn-primary w-full sm:w-auto">Procesar</button>
          </>
        )}
      </div>
    </div>
  );
}
