/**
 * Notes history persisted in IndexedDB.
 *
 * The old backend stored notes as files on disk (output_dir). In the browser we use
 * IndexedDB (notes can be large, and localStorage is capped at ~5 MB). The API mirrors
 * the previous server endpoints so the rest of the app (history tab, NotePreview rename)
 * keeps the same shapes.
 */

import type { NoteListItem, NoteDetail } from "@/types";

const DB_NAME = "voxnote";
const DB_VERSION = 1;
const STORE = "notes";

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
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
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
  // jszip is a transitive dep of @huggingface/transformers; load it dynamically so it
  // is only pulled into the bundle when the user actually triggers "Download all".
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
