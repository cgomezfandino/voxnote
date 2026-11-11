/**
 * Notes history persisted in IndexedDB.
 *
 * The old backend stored notes as files on disk (output_dir). In the browser we use
 * IndexedDB (notes can be large, and localStorage is capped at ~5 MB). The API mirrors
 * the previous server endpoints so the rest of the app (history tab, NotePreview rename)
 * keeps the same shapes.
 */

import type {
  InsightsResult,
  NoteListItem,
  NoteDetail,
  TranscriptionResult,
} from "@/types";

const DB_NAME = "voxnote";
const DB_VERSION = 3;
const STORE = "notes";
const DRAFT_STORE = "drafts";
/** Audio chunks of the recording in progress (v3), flushed every few seconds. */
const CHUNK_STORE = "recording_chunks";

interface NoteRecord {
  filename: string;
  content: string;
  created_at: string; // ISO timestamp
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "filename" });
        store.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CHUNK_STORE)) {
        db.createObjectStore(CHUNK_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab is upgrading the schema: let it, and reopen lazily next time.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
  storeName: string = STORE,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const result = fn(store);
        if (result instanceof Promise) {
          result.then(resolve, reject);
        } else {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        }
      }),
  );
}

export async function saveNote(filename: string, content: string): Promise<void> {
  const existing = await getNote(filename).catch(() => null);
  const created_at = existing?.created_at ?? new Date().toISOString();
  await tx("readwrite", (store) =>
    store.put({ filename, content, created_at } as NoteRecord),
  );
}

export async function listNotes(): Promise<NoteListItem[]> {
  const all = await tx<NoteRecord[]>("readonly", (store) => store.getAll());
  const records = Array.isArray(all) ? all : [];
  return records
    .map((r) => ({
      filename: r.filename,
      created_at: r.created_at,
      // Preview: first ~200 chars of the note body (skip frontmatter).
      preview: previewFromContent(r.content),
      size_bytes: new Blob([r.content]).size,
      // Title: parsed from the "# 📋 Meeting — TITLE" H1, falling back to the filename.
      title: titleFromContent(r.content) || r.filename.replace(/\.md$/, ""),
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getNote(filename: string): Promise<NoteDetail> {
  const record = await tx<NoteRecord>("readonly", (store) =>
    store.get(filename),
  );
  if (!record) throw new Error(`Note not found: ${filename}`);
  return {
    filename: record.filename,
    content: record.content,
    created_at: record.created_at,
  };
}

/**
 * Bundle every stored note into a single ZIP download. Each note becomes a `.md` file
 * named after its stored filename. Includes a manifest with created_at timestamps.
 */
export async function exportAllNotes(): Promise<Blob> {
  // Declared as a direct dependency (it used to arrive transitively via docx, which
  // dropped it in 9.15). Loaded dynamically so it is only pulled into the bundle when
  // the user actually triggers "Download all".
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const all = await tx<NoteRecord[]>("readonly", (store) => store.getAll());
  const records = Array.isArray(all) ? all : [];
  const manifest: { filename: string; created_at: string }[] = [];
  for (const r of records) {
    zip.file(r.filename, r.content);
    manifest.push({ filename: r.filename, created_at: r.created_at });
  }
  manifest.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

/** Remove a single stored note by filename. */
export async function deleteNote(filename: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(filename));
}

/**
 * Remove every stored note (the whole history). Used by the "Clear history" action.
 */
export async function clearAllNotes(): Promise<void> {
  await tx("readwrite", (store) => store.clear());
}

/**
 * Replace SPEAKER_xx labels in a stored note with real names. Mirrors the old
 * POST /api/notes/{filename}/speakers endpoint.
 */
export async function renameSpeakers(
  filename: string,
  mapping: Record<string, string>,
): Promise<NoteDetail> {
  const record = await tx<NoteRecord>("readonly", (store) =>
    store.get(filename),
  );
  if (!record) throw new Error(`Note not found: ${filename}`);
  let content = record.content;
  for (const [label, name] of Object.entries(mapping)) {
    if (!name.trim()) continue;
    content = content.split(label).join(name.trim());
  }
  await tx("readwrite", (store) =>
    store.put({ ...record, content } as NoteRecord),
  );
  return { filename, content, created_at: record.created_at };
}

// --- Work-in-progress draft -------------------------------------------------
//
// The current recording/upload and everything derived from it (transcript,
// edits, insights, note) is kept as a single draft record so navigating to
// Settings/Notes — or even reloading or closing the tab — never loses work.
// Blobs are stored natively by IndexedDB. Nothing here leaves the device.

export interface DraftRecord {
  id: "current";
  blob: Blob;
  filename: string;
  source: "recorded" | "uploaded";
  transcription: TranscriptionResult | null;
  editedText: string;
  insights: InsightsResult | null;
  note: { content: string; filename: string } | null;
  /** Recording length in seconds (recordings only; uploads leave it undefined). */
  duration?: number;
  updatedAt: string;
}

export async function saveDraft(
  draft: Omit<DraftRecord, "id" | "updatedAt">,
): Promise<void> {
  await tx(
    "readwrite",
    (store) =>
      store.put({
        ...draft,
        id: "current",
        updatedAt: new Date().toISOString(),
      } as DraftRecord),
    DRAFT_STORE,
  );
}

export async function loadDraft(): Promise<DraftRecord | null> {
  const record = await tx<DraftRecord | undefined>(
    "readonly",
    (store) => store.get("current"),
    DRAFT_STORE,
  );
  return record ?? null;
}

export async function clearDraft(): Promise<void> {
  await tx("readwrite", (store) => store.delete("current"), DRAFT_STORE);
}

// --- Recording in progress ------------------------------------------------
//
// While recording, MediaRecorder emits a chunk every few seconds; each one is
// appended here so a reload, a closed tab or a crash in the middle of a
// meeting loses at most the last few seconds instead of everything. The
// chunks are folded into the draft (and this store emptied) when recording
// stops, or on the next app start if it never stopped cleanly.

interface ChunkRecord {
  chunk: Blob;
  mimeType: string;
  startedAt: number; // epoch ms when the recording started
  at: number; // epoch ms when this chunk was emitted
}

export async function appendRecordingChunk(record: ChunkRecord): Promise<void> {
  await tx("readwrite", (store) => store.add(record), CHUNK_STORE);
}

/** All chunks of an unfinished recording, in order (null when there is none). */
export async function loadRecordingChunks(): Promise<
  { blob: Blob; startedAt: number; endedAt: number } | null
> {
  const records = await tx<ChunkRecord[]>(
    "readonly",
    (store) => store.getAll() as IDBRequest<ChunkRecord[]>,
    CHUNK_STORE,
  );
  if (!records.length) return null;
  return {
    blob: new Blob(
      records.map((r) => r.chunk),
      { type: records[0].mimeType || "audio/webm" },
    ),
    startedAt: records[0].startedAt,
    endedAt: records[records.length - 1].at,
  };
}

export async function clearRecordingChunks(): Promise<void> {
  await tx("readwrite", (store) => store.clear(), CHUNK_STORE);
}

function previewFromContent(content: string): string {
  // Strip frontmatter and the leading H1 if present; take the first meaningful lines.
  let body = content;
  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) body = body.slice(end + 4);
  }
  body = body.replace(/^# .*/m, "").trim();
  return body.replace(/\s+/g, " ").slice(0, 200);
}

/** Extract the human title from a note's "# 📋 Meeting — TITLE" H1. */
function titleFromContent(content: string): string {
  const m = content.match(/^#\s+.*?Meeting\s+—\s+(.+)$/m);
  if (m) return m[1].trim();
  const h1 = content.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : "";
}
