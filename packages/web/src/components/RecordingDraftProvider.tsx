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
import { clearDraft, loadDraft, saveDraft } from "@/lib/notes-db";

/**
 * The work-in-progress recording, kept above the route tree so navigating to
 * Settings or Notes never loses it, and mirrored to IndexedDB so even a
 * reload or a closed tab restores it. Audio stays on this device.
 */

export interface RecordingDraft {
  blob: Blob | null;
  url: string | null;
  filename: string;
  source: "recorded" | "uploaded" | null;
  transcription: TranscriptionResult | null;
  editedText: string;
  insights: InsightsResult | null;
  note: { content: string; filename: string } | null;
  /** True when this draft was restored from storage (not created this visit). */
  restored: boolean;
  setAudio: (blob: Blob, filename: string, source: "recorded" | "uploaded") => void;
  setTranscription: (t: TranscriptionResult | null) => void;
  setEditedText: (t: string) => void;
  setInsights: (i: InsightsResult | null) => void;
  setNote: (n: { content: string; filename: string } | null) => void;
  clear: () => void;
}

const DraftContext = createContext<RecordingDraft | null>(null);

export function useRecordingDraft(): RecordingDraft {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useRecordingDraft must be used within RecordingDraftProvider");
  return ctx;
}

export default function RecordingDraftProvider({ children }: { children: ReactNode }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("recording.wav");
  const [source, setSource] = useState<"recorded" | "uploaded" | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [editedText, setEditedText] = useState("");
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [note, setNote] = useState<{ content: string; filename: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);
  const urlRef = useRef<string | null>(null);

  const replaceUrl = useCallback((next: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const nextUrl = next ? URL.createObjectURL(next) : null;
    urlRef.current = nextUrl;
    setUrl(nextUrl);
  }, []);

  // Restore any saved draft once, on first mount.
  useEffect(() => {
    let cancelled = false;
    loadDraft()
      .then((draft) => {
        if (cancelled) return;
        if (draft?.blob) {
          setBlob(draft.blob);
          replaceUrl(draft.blob);
          setFilename(draft.filename);
          setSource(draft.source);
          setTranscription(draft.transcription);
          setEditedText(draft.editedText);
          setInsights(draft.insights);
          setNote(draft.note);
          setRestored(true);
        }
      })
      .catch(() => {
        // No readable draft — start fresh.
      })
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [replaceUrl]);

  // Mirror every change to IndexedDB (after hydration, so we never overwrite
  // a saved draft with the initial empty state).
  useEffect(() => {
    if (!hydrated.current) return;
    if (!blob || !source) {
      void clearDraft().catch(() => {});
      return;
    }
    void saveDraft({
      blob,
      filename,
      source,
      transcription,
      editedText,
      insights,
      note,
    }).catch(() => {
      // Storage full/unavailable — the in-memory draft still survives navigation.
    });
  }, [blob, filename, source, transcription, editedText, insights, note]);

  const setAudio = useCallback(
    (next: Blob, name: string, src: "recorded" | "uploaded") => {
      setBlob(next);
      replaceUrl(next);
      setFilename(name);
      setSource(src);
      setTranscription(null);
      setEditedText("");
      setInsights(null);
      setNote(null);
      setRestored(false);
    },
    [replaceUrl],
  );

  const clear = useCallback(() => {
    setBlob(null);
    replaceUrl(null);
    setFilename("recording.wav");
    setSource(null);
    setTranscription(null);
    setEditedText("");
    setInsights(null);
    setNote(null);
    setRestored(false);
    void clearDraft().catch(() => {});
  }, [replaceUrl]);

  return (
    <DraftContext.Provider
      value={{
        blob,
        url,
        filename,
        source,
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
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}
