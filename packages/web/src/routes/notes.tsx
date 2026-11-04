import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Download, FileText, LoaderCircle, Search, Trash2 } from "lucide-react";
import { clearAllNotes, exportAllNotes, listNotes } from "@/lib/api";
import type { NoteListItem } from "@/types";

export const Route = createFileRoute("/notes")({
  ssr: false,
  component: NotesPage,
});

function NotesPage() {
  const location = useLocation();
  const isDetail = location.pathname !== "/notes";
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listNotes()
      .then((r) => {
        if (!cancelled) setNotes(r);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDetail]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      `${n.title} ${n.filename} ${n.preview}`.toLowerCase().includes(q),
    );
  }, [notes, query]);

  if (isDetail) return <Outlet />;

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const blob = await exportAllNotes();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voxnote-notes-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // non-fatal
    } finally {
      setExporting(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Delete all ${notes.length} notes? This cannot be undone.`)) return;
    setClearing(true);
    try {
      await clearAllNotes();
      setNotes([]);
    } catch {
      // non-fatal
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">Notes</h2>
        <p className="text-muted-foreground">
          Stored only in this browser (IndexedDB). {notes.length} note{notes.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-2 flex-1 min-w-52 bg-background border border-border rounded-md px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, filename or content…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search notes"
          />
        </label>
        {notes.length > 0 && (
          <>
            <button onClick={handleExportAll} disabled={exporting} className="btn-secondary flex items-center gap-1.5 disabled:opacity-60">
              {exporting ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download all (.zip)
            </button>
            <button onClick={handleClearAll} disabled={clearing} className="btn-secondary flex items-center gap-1.5 disabled:opacity-60">
              {clearing ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Clear
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading notes…</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-5">
            {notes.length === 0
              ? "No notes yet. Your first note is one recording away."
              : "No notes match your search."}
          </p>
          {notes.length === 0 && (
            <Link to="/" className="btn-primary">
              Create your first note
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <Link
              key={note.filename}
              to="/notes/$filename"
              params={{ filename: note.filename }}
              className="card block w-full text-left hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{note.title}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{note.filename}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{note.preview}</p>
                  <div className="flex items-center gap-4 mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(note.created_at).toLocaleDateString("en")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(note.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Outlet />
    </div>
  );
}
