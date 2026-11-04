import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import NotePreview from "@/components/NotePreview";
import { deleteNote, getNote } from "@/lib/api";
import type { NoteDetail } from "@/types";

export const Route = createFileRoute("/notes/$filename")({
  ssr: false,
  component: NoteDetailPage,
});

function NoteDetailPage() {
  const { filename } = Route.useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNote(filename)
      .then((n) => {
        if (!cancelled) setNote(n);
      })
      .catch(() => {
        if (!cancelled) setError("Note not found in this browser.");
      });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteNote(filename);
      void navigate({ to: "/notes" });
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/notes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to notes
        </Link>
        {note && (
          <button onClick={handleDelete} disabled={deleting} className="btn-secondary flex items-center gap-1.5 disabled:opacity-60">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>
      {error ? (
        <div className="card text-center py-12 text-sm text-muted-foreground">{error}</div>
      ) : !note ? (
        <p className="text-center py-12 text-muted-foreground">Loading note…</p>
      ) : (
        <NotePreview key={note.filename} content={note.content} filename={note.filename} />
      )}
    </div>
  );
}
