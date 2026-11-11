import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { InsightsResult, TranscriptionResult } from "@/types";
import {
  appendRecordingChunk,
  clearDraft,
  clearRecordingChunks,
  loadDraft,
  loadRecordingChunks,
  saveDraft,
} from "@/lib/notes-db";

/**
 * The work-in-progress recording, kept above the route tree so navigating to
 * Settings or Notes never loses it, and mirrored to IndexedDB so even a
 * reload or a closed tab restores it. Audio stays on this device.
 *
 * The microphone session itself also lives here (not in the Record page), so
 * a recording KEEPS GOING while the user visits Notes or Settings. Its chunks
 * are flushed to IndexedDB every few seconds; if the tab is closed or crashes
 * mid-recording, the next start recovers everything up to the last chunk.
 */

/** Seconds of audio per MediaRecorder chunk (= max loss on a crash). */
const CHUNK_SECONDS = 5;
/** Web Lock held by the tab that is recording, so other tabs don't "recover" it. */
const RECORDING_LOCK = "voxnote-recording";

type NoteRef = { content: string; filename: string };

export interface RecordingDraft {
  blob: Blob | null;
  url: string | null;
  filename: string;
  source: "recorded" | "uploaded" | null;
  /** Recording length in seconds (recordings only). */
  duration: number | null;
  transcription: TranscriptionResult | null;
  editedText: string;
  insights: InsightsResult | null;
  note: NoteRef | null;
  /** How this draft got here when it wasn't created in this visit. */
  restored: false | "saved" | "interrupted";
  setAudio: (
    blob: Blob,
    filename: string,
    source: "recorded" | "uploaded",
    duration?: number | null,
  ) => void;
  setTranscription: (t: TranscriptionResult | null) => void;
  setEditedText: (t: string) => void;
  setInsights: (i: InsightsResult | null) => void;
  setNote: (n: NoteRef | null) => void;
  clear: () => void;

  // --- Live microphone session -------------------------------------------
  isRecording: boolean;
  /** Seconds since the current recording started. */
  elapsed: number;
  /** Analyser on the live mic stream (for the waveform), null when idle. */
  analyser: AnalyserNode | null;
  /** Starts recording; rejects when the microphone is unavailable/denied. */
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

const DraftContext = createContext<RecordingDraft | null>(null);

export function useRecordingDraft(): RecordingDraft {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useRecordingDraft must be used within RecordingDraftProvider");
  return ctx;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function extensionFor(mime: string): string {
  return mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
}

export default function RecordingDraftProvider({ children }: { children: ReactNode }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("recording.webm");
  const [source, setSource] = useState<"recorded" | "uploaded" | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [editedText, setEditedText] = useState("");
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [note, setNote] = useState<NoteRef | null>(null);
  const [restored, setRestored] = useState<false | "saved" | "interrupted">(false);
  const [hydrated, setHydrated] = useState(false);
  const urlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const releaseLockRef = useRef<(() => void) | null>(null);

  const replaceUrl = useCallback((next: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const nextUrl = next ? URL.createObjectURL(next) : null;
    urlRef.current = nextUrl;
    setUrl(nextUrl);
  }, []);

  const setAudio = useCallback(
    (
      next: Blob,
      name: string,
      src: "recorded" | "uploaded",
      seconds: number | null = null,
    ) => {
      setBlob(next);
      replaceUrl(next);
      setFilename(name);
      setSource(src);
      setDuration(seconds);
      setTranscription(null);
      setEditedText("");
      setInsights(null);
      setNote(null);
      setRestored(false);
    },
    [replaceUrl],
  );

  // On first mount: recover an interrupted recording (tab closed / crashed
  // while recording) — it is always newer than the saved draft, because
  // starting a recording requires discarding the previous draft — otherwise
  // restore the saved draft.
  useEffect(() => {
    let cancelled = false;

    const recoverInterrupted = async (): Promise<boolean> => {
      const partial = await loadRecordingChunks();
      if (!partial || cancelled) return false;
      const seconds = Math.max(1, Math.round((partial.endedAt - partial.startedAt) / 1000));
      const name = `recording.${extensionFor(partial.blob.type)}`;
      // Persist as the draft BEFORE dropping the chunks, so a second crash
      // here can't lose it either.
      await saveDraft({
        blob: partial.blob,
        filename: name,
        source: "recorded",
        duration: seconds,
        transcription: null,
        editedText: "",
        insights: null,
        note: null,
      });
      await clearRecordingChunks();
      if (cancelled) return true;
      setAudio(partial.blob, name, "recorded", seconds);
      setRestored("interrupted");
      return true;
    };

    const run = async () => {
      // Another tab holding the lock is recording right now: its chunks are
      // live, not orphaned — leave them alone.
      let recovered = false;
      if (typeof navigator !== "undefined" && navigator.locks) {
        await navigator.locks.request(RECORDING_LOCK, { ifAvailable: true }, async (lock) => {
          if (lock) recovered = await recoverInterrupted();
        });
      } else {
        recovered = await recoverInterrupted();
      }
      if (recovered || cancelled) return;

      const draft = await loadDraft();
      if (cancelled || !draft?.blob) return;
      setBlob(draft.blob);
      replaceUrl(draft.blob);
      setFilename(draft.filename);
      setSource(draft.source);
      setDuration(draft.duration ?? null);
      setTranscription(draft.transcription);
      setEditedText(draft.editedText);
      setInsights(draft.insights);
      setNote(draft.note);
      setRestored("saved");
    };

    run()
      .catch(() => {
        // No readable draft — start fresh.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [replaceUrl, setAudio]);

  // Mirror changes to IndexedDB (after hydration, so we never overwrite a
  // saved draft with the initial empty state). Debounced: typing in the
  // transcript must not rewrite a long audio blob on every keystroke.
  useEffect(() => {
    if (!hydrated) return;
    const handle = setTimeout(() => {
      if (!blob || !source) {
        void clearDraft().catch(() => {});
        return;
      }
      void saveDraft({
        blob,
        filename,
        source,
        duration: duration ?? undefined,
        transcription,
        editedText,
        insights,
        note,
      }).catch(() => {
        // Storage full/unavailable — the in-memory draft still survives navigation.
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [hydrated, blob, filename, source, duration, transcription, editedText, insights, note]);

  const clear = useCallback(() => {
    setBlob(null);
    replaceUrl(null);
    setFilename("recording.webm");
    setSource(null);
    setDuration(null);
    setTranscription(null);
    setEditedText("");
    setInsights(null);
    setNote(null);
    setRestored(false);
    void clearDraft().catch(() => {});
  }, [replaceUrl]);

  // --- Live microphone session ---------------------------------------------

  const teardownSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAnalyser(null);
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (recorderRef.current?.state === "recording") return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioCtx = new AudioContext();
    await audioCtx.resume().catch(() => {});
    const node = audioCtx.createAnalyser();
    node.fftSize = 2048;
    audioCtx.createMediaStreamSource(stream).connect(node);
    audioCtxRef.current = audioCtx;
    setAnalyser(node);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const type = recorder.mimeType || mimeType || "audio/webm";
    const chunks: Blob[] = [];
    const startedAt = Date.now();

    // Any leftovers belong to a recording that was already recovered or discarded.
    await clearRecordingChunks().catch(() => {});

    // Hold a Web Lock for as long as we record (see recovery above).
    if (navigator.locks) {
      void navigator.locks.request(
        RECORDING_LOCK,
        () => new Promise<void>((resolve) => (releaseLockRef.current = resolve)),
      );
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      chunks.push(e.data);
      void appendRecordingChunk({ chunk: e.data, mimeType: type, startedAt, at: Date.now() })
        .catch(() => {
          // Storage full — the in-memory chunks still produce the recording on Stop.
        });
    };

    recorder.onstop = () => {
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const audio = new Blob(chunks, { type });
      const name = `recording.${extensionFor(type)}`;
      setAudio(audio, name, "recorded", seconds);
      // Write the finished recording as the draft first, then drop the chunks.
      void saveDraft({
        blob: audio,
        filename: name,
        source: "recorded",
        duration: seconds,
        transcription: null,
        editedText: "",
        insights: null,
        note: null,
      })
        .then(() => clearRecordingChunks())
        .catch(() => {})
        .finally(() => {
          releaseLockRef.current?.();
          releaseLockRef.current = null;
        });
      recorderRef.current = null;
      teardownSession();
    };

    // Mic unplugged / permission revoked mid-recording: stop and keep what we have.
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };
    });

    recorder.start(CHUNK_SECONDS * 1000);
    setElapsed(0);
    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
  }, [setAudio, teardownSession]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // onstop builds the blob and tears the session down
    } else {
      teardownSession();
    }
  }, [teardownSession]);

  // Closing/reloading the tab while recording: ask first. (Chunks are already
  // on disk, so even if the user confirms, the recording is recovered.)
  useEffect(() => {
    if (!isRecording) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isRecording]);

  return (
    <DraftContext.Provider
      value={{
        blob,
        url,
        filename,
        source,
        duration,
        transcription,
        editedText,
        insights,
        note,
        restored,
        setAudio,
        setTranscription,
        setEditedText,
        setInsights,
        setNote,
        clear,
        isRecording,
        elapsed,
        analyser,
        startRecording,
        stopRecording,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}
