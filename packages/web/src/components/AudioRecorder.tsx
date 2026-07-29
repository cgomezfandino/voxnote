"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, RefreshCw, Play, Pause, FileMusic } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  initialBlob?: Blob | null;
  initialUrl?: string | null;
  initialDuration?: number;
  onReset?: () => void;
  onProcess?: () => void;
}

export default function AudioRecorder({
  onRecordingComplete,
  initialBlob = null,
  initialUrl = null,
  initialDuration = 0,
  onReset,
  onProcess,
}: AudioRecorderProps) {
  const { showToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(initialDuration);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(initialBlob);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(36).fill(8));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimeRef = useRef(initialDuration);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new AudioContext();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      
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
        onRecordingComplete(blob, recordingTimeRef.current);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          recordingTimeRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
      
      // Configure analyser for waveform visualization
      analyser.fftSize = 2048;
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const smoothBars = new Array(36).fill(8);

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        const numBars = 36;
        const step = Math.floor(bufferLength / numBars);

        for (let i = 0; i < numBars; i++) {
          let peak = 0;
          for (let j = 0; j < step; j++) {
            const amp = Math.abs(dataArray[i * step + j] - 128);
            if (amp > peak) peak = amp;
          }

          const normalized = peak / 128;
          const boosted = Math.pow(normalized, 0.45);
          const target = boosted * 72 + 8; // Responsive bounds

          if (target > smoothBars[i]) {
            smoothBars[i] += (target - smoothBars[i]) * 0.72; // Fast response
          } else {
            smoothBars[i] += (target - smoothBars[i]) * 0.15; // Smooth decay
          }
        }

        setVisualizerData([...smoothBars]);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();
    } catch {
      showToast(
        "Could not access the microphone. Please grant the necessary permissions.",
        "error"
      );
    }
  }, [onRecordingComplete, showToast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
    setVisualizerData(Array(36).fill(8));
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

  const hasRecording = (audioUrl || initialUrl) && !isRecording;
  const playbackUrl = audioUrl || initialUrl;

  return (
    <div className="card relative overflow-hidden flex flex-col justify-between min-h-[300px]">
      
      {/* Decorative backdrop light glows */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dynamic Sound Wave Visualizer Container */}
      <div className="flex items-end justify-center gap-[4px] sm:gap-[6px] h-28 mb-4 px-6 border-b border-border pb-4 relative z-10">
        {visualizerData.map((height, i) => (
          <div
            key={i}
            style={{
              height: isRecording ? `${height}px` : hasRecording ? "10px" : "6px",
              transition: isRecording ? "none" : "height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className={`w-[5px] sm:w-[6px] rounded-full transition-all duration-300 ${
              isRecording 
                ? "bg-gradient-to-t from-primary via-accent to-accent shadow-[0_0_10px_rgba(52,211,153,0.3)]" 
                : hasRecording 
                  ? "bg-primary" 
                  : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Recording Info & Stats Deck */}
      <div className="text-center mb-6 relative z-10 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-1"
            >
              <div className="text-4xl sm:text-5xl font-bold text-accent tracking-wider font-mono tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                {formatDuration(recordingTime)}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-accent uppercase tracking-widest mt-1">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Recording...
              </div>
            </motion.div>
          ) : hasRecording ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 py-2"
            >
              <div className="flex items-center justify-center gap-4 bg-[var(--accordion-bg)] p-4 rounded-xl border border-[var(--accordion-border)] max-w-sm mx-auto">
                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent text-lg">✓</span>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recording Finished</div>
                  <div className="text-sm font-semibold text-foreground font-mono mt-0.5">{formatDuration(recordingTime)}</div>
                </div>
              </div>

              {/* Audio Playback Deck */}
              <div className="bg-[var(--input-bg)] rounded-xl p-3.5 mx-auto max-w-xs border border-[var(--accordion-border)] flex items-center justify-between shadow-lg">
                <audio ref={audioRef} src={playbackUrl || undefined} onEnded={() => setIsPlaying(false)} />
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                  >
                    {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 ml-0.5" />}
                  </button>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Listen to audio</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono bg-[var(--accordion-bg)] px-2.5 py-1 rounded-md">WAV</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs sm:text-sm text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed"
            >
              Click the button below to start voice recording.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Trigger Controls */}
      <div className="flex items-center justify-center pb-2 relative z-10">
        <AnimatePresence mode="wait">
          {!isRecording && !hasRecording && (
            <motion.button
              key="btn-start"
              onClick={startRecording}
              style={{ 
                background: "var(--record-btn-bg)",
                boxShadow: "var(--record-shadow)"
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 focus:outline-none"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-7 h-7 sm:w-9 sm:h-9 text-[var(--record-mic-color)] fill-[var(--record-mic-color)]" />
            </motion.button>
          )}

          {isRecording && (
            <motion.div
              key="recording-stop-container"
              className="relative flex items-center justify-center"
            >
              {/* Pulsing Concentric Aura */}
              <div className="absolute w-24 h-24 rounded-full bg-accent/25 animate-ping opacity-60" />
              <div className="absolute w-20 h-20 rounded-full bg-accent/15 animate-pulse" />
              
              <button
                onClick={stopRecording}
                className="relative z-10 w-16 h-16 rounded-full bg-accent text-background flex items-center justify-center hover:scale-105 hover:bg-accent/90 transition-all shadow-[0_0_20px_rgba(52,211,153,0.45)] focus:outline-none"
              >
                <Square className="w-5 h-5 fill-accent-foreground stroke-none" />
              </button>
            </motion.div>
          )}

          {hasRecording && (
            <motion.div
              key="btn-actions"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3.5 w-full max-w-sm justify-center px-4"
            >
              <button 
                onClick={resetRecording} 
                className="btn-secondary flex-1 py-3 px-4 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                Re-record
              </button>
              <button 
                onClick={onProcess} 
                className="btn-accent flex-1 py-3 px-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
              >
                <FileMusic className="w-4 h-4 text-accent-foreground" />
                Process
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
