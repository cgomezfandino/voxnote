import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import {
  CircleAlert,
  FileMusic,
  Lock,
  PencilLine,
  Sparkles,
} from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioVisualizer from "@/components/AudioVisualizer";
import FileUpload from "@/components/FileUpload";
import InsightsDisplay from "@/components/InsightsDisplay";
import NotePreview from "@/components/NotePreview";
import ProcessingSteps from "@/components/ProcessingSteps";
import { useConfig } from "@/hooks/useConfig";
import { useRecordingDraft } from "@/components/RecordingDraftProvider";
import { useVoxnote } from "@/hooks/useVoxnote";

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomePage,
});

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  zai: "Z.ai",
  kimi: "Kimi",
  ollama: "Ollama Cloud",
  ollama_local: "Ollama on this computer",
  chrome: "Chrome local AI",
};

const KEY_FIELDS: Record<string, string> = {
  openai: "api_key_openai",
  anthropic: "api_key_anthropic",
  google: "api_key_google",
  zai: "api_key_zai",
  kimi: "api_key_kimi",
  ollama: "api_key_ollama",
};

function StepsIndicator({ stage }: { stage: 1 | 2 | 3 | 4 }) {
  const steps = ["Record or upload", "Transcribe", "Check the text", "Your note"];
  return (
    <ol className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap" aria-label="Progress">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const done = n < stage;
        const current = n === stage;
        return (
          <li key={label} className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold border ${
                done
                  ? "bg-accent-light text-accent border-accent/30"
                  : current
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border"
              }`}
              aria-current={current ? "step" : undefined}
            >
              <span aria-hidden>{done ? "✓" : n}</span>
              <span className="hidden md:inline">{label}</span>
            </span>
            {n < 4 && <span className="w-3 sm:w-5 h-px bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function PrivacyBadge({ label, local }: { label: string; local: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <Lock className="w-3 h-3 text-accent" />
      {label}: {local ? "on this device" : "sent to provider"}
    </span>
  );
}

function HomePage() {
  const { config, isLoaded } = useConfig();
  const {
    transcribe,
    extractInsights,
    generateNote,
    steps,
    error,
    reset,
  } = useVoxnote();

  // The draft (audio + transcript + insights + note) lives above the route
  // tree and in IndexedDB, so going to Settings/Notes or reloading the page
  // never loses work in progress.
  const draft = useRecordingDraft();
  const recordedBlob = draft.source === "recorded" ? draft.blob : null;
  const recordedUrl = draft.url;
  const transcription = draft.transcription;
  const setTranscription = draft.setTranscription;
  const editedText = draft.editedText;
  const setEditedText = draft.setEditedText;
  const insights = draft.insights;
  const setInsights = draft.setInsights;
  const note = draft.note;
  const setNote = draft.setNote;
  const [busy, setBusy] = useState(false);

  const providerLabel =
    PROVIDER_LABELS[config.llm_provider] ?? config.llm_provider;
  const insightsLocal =
    config.llm_provider === "chrome" || config.llm_provider === "ollama_local";
  const keyField = KEY_FIELDS[config.llm_provider];
  const needsKey =
    !insightsLocal &&
    !!keyField &&
    !(config[keyField as keyof typeof config] as string)?.trim();

  // Destructive actions on an existing draft always ask first: audio,
  // transcript edits, insights and note are all lost and can't be undone.
  const confirmDiscard = useCallback(
    (question: string) => !draft.blob || window.confirm(question),
    [draft.blob],
  );

  const clearAudio = useCallback(() => {
    if (!confirmDiscard("Discard this recording and everything made from it (transcript, edits, note)? This can't be undone.")) {
      return;
    }
    draft.clear();
    reset();
  }, [confirmDiscard, draft, reset]);

  const confirmNewRecording = useCallback(() => {
    if (!confirmDiscard("Start a new recording? The current audio and its transcript will be discarded.")) {
      return false;
    }
    draft.clear();
    reset();
    return true;
  }, [confirmDiscard, draft, reset]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (!confirmDiscard("Replace the current audio with this file? Its transcript and note will be discarded.")) {
        return;
      }
      reset();
      draft.setAudio(file, file.name, "uploaded");
    },
    [confirmDiscard, draft, reset],
  );

  const audioBlob = draft.blob;

  const stage: 1 | 2 | 3 | 4 = note
    ? 4
    : transcription
      ? 3
      : audioBlob
        ? 2
        : 1;


  const handleTranscribe = async () => {
    if (!audioBlob || busy) return;
    setBusy(true);
    setInsights(null);
    setNote(null);
    try {
      const result = await transcribe(audioBlob, {
        model: config.whisper_model,
        language: config.language,
      });
      setTranscription(result);
      setEditedText(result.text);
    } catch {
      // error state is surfaced by the hook
    } finally {
      setBusy(false);
    }
  };

  const handleInsights = async () => {
    if (!transcription || busy) return;
    setBusy(true);
    try {
      const result = await extractInsights(editedText, config.llm_provider);
      setInsights(result);
      const generated = await generateNote(
        editedText,
        result,
        draft.filename || "recording.webm",
      );
      setNote({ content: generated.content, filename: generated.filename });
    } catch {
      // error state is surfaced by the hook
    } finally {
      setBusy(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Turn a meeting into notes
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Record or upload audio, check the transcript, and get a tidy note.
            Your audio never leaves this device.
          </p>
        </div>
        <StepsIndicator stage={stage} />
        <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
          <PrivacyBadge label="Transcription" local />
          <PrivacyBadge label={`Insights (${providerLabel})`} local={insightsLocal} />
          <PrivacyBadge label="Notes" local />
        </div>
      </div>

      {draft.restored && audioBlob && !draft.isRecording && (
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-accent-light border border-accent/30 text-sm">
          <span>
            {draft.restored === "interrupted"
              ? "Your last recording was interrupted (the tab was closed or reloaded). We recovered it up to the last few seconds."
              : "Welcome back — your recording is still here, exactly where you left it."}
          </span>
          <button
            onClick={clearAudio}
            className="font-semibold underline shrink-0 min-h-11 px-2"
          >
            Discard it
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <AudioRecorder
          recordingUrl={recordedBlob ? recordedUrl : null}
          recordingDuration={draft.duration}
          onBeforeStart={confirmNewRecording}
          onReset={clearAudio}
          onProcess={handleTranscribe}
          busy={busy}
        />
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {!recordedBlob &&
          !draft.isRecording &&
          (recordedUrl ? (
            <AudioVisualizer
              audioUrl={recordedUrl}
              fileName={draft.filename || "recording.webm"}
            />
          ) : (
            <FileUpload onFileSelected={handleFileSelected} disabled={busy} />
          ))}

        {audioBlob && !transcription && (
          <div className="flex justify-center gap-3">
            <button
              onClick={handleTranscribe}
              disabled={busy}
              className="btn-primary gap-2 disabled:opacity-50"
            >
              <FileMusic className="w-4 h-4" />
              {busy ? "Transcribing…" : "Transcribe"}
            </button>
            <button
              onClick={clearAudio}
              disabled={busy}
              className="btn-secondary gap-2 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger-border">
            <CircleAlert className="w-4 h-4 text-danger mt-0.5 shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {steps.length > 0 && (
          <ProcessingSteps
            steps={steps}
            onRetry={audioBlob && !transcription ? handleTranscribe : undefined}
          />
        )}

        {transcription && !note && (
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <PencilLine className="w-4 h-4 text-primary" />
              <h3 className="text-base font-semibold">
                Step 3 — check the text
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {insightsLocal
                ? `Insights will be generated on this device with ${providerLabel}. Nothing is sent to the internet.`
                : `When you continue, this text (not the audio) is sent to ${providerLabel} with your API key. Edit or remove anything sensitive first.`}
            </p>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={10}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none"
              aria-label="Transcript (editable)"
            />
            {needsKey && (
              <p className="text-sm text-foreground bg-primary-light border border-primary/25 rounded-lg px-3 py-2.5">
                One thing first: add your {providerLabel} key in Settings so we
                can create the note. Your key stays in this browser.{" "}
                <Link to="/settings" className="text-primary font-semibold underline">
                  Open Settings
                </Link>
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={clearAudio}
                disabled={busy}
                className="btn-secondary disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={handleInsights}
                disabled={busy || !editedText.trim()}
                className="btn-primary gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {busy
                  ? "Creating your note…"
                  : "Create my note"}
              </button>
            </div>
          </div>
        )}

        {insights && <InsightsDisplay insights={insights} />}
        {note && (
          <>
            <NotePreview
              key={note.filename}
              content={note.content}
              filename={note.filename}
            />
            <p className="text-center text-sm text-muted-foreground">
              Saved to your local history.{" "}
              <Link to="/notes" className="text-primary underline">
                View all notes
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
