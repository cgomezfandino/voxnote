"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileType2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { exportNoteDocx } from "@/lib/api";

interface NotePreviewProps {
  content: string;
  filename: string;
}

function stripFrontmatter(content: string): string {
  if (content.startsWith("---")) {
    const end = content.indexOf("---", 3);
    if (end !== -1) {
      return content.slice(end + 3).trim();
    }
  }
  return content;
}

/** Strip leading emoji/symbols so headings read cleanly. */
function cleanTitle(text: string): string {
  // Drop leading non-letter/digit chars (emoji, symbols). À-ÿ keeps Spanish accents.
  return text.replace(/^[^A-Za-zÀ-ÿ0-9]+/, "").trim() || text.trim();
}

/**
 * Pull the transcript out of the note so it can be shown in a collapsible block.
 * The transcript uses `[SPEAKER_00]:` lines that Markdown would mis-parse as link
 * definitions, so it is rendered as plain text, not Markdown.
 */
function extractTranscript(md: string): {
  main: string;
  transcript: string | null;
  title: string;
} {
  const details = md.match(/<details>([\s\S]*?)<\/details>/i);
  if (details) {
    const inner = details[1];
    const summary = inner.match(/<summary>([\s\S]*?)<\/summary>/i);
    const title = summary
      ? cleanTitle(summary[1].replace(/<\/?[^>]+>/g, "").trim())
      : "Transcripción completa";
    const transcript = inner.replace(/<summary>[\s\S]*?<\/summary>/i, "").trim();
    return { main: md.replace(details[0], "").trim(), transcript, title };
  }

  const heading = md.match(/^##\s+.*transcripci[oó]n.*$/im);
  if (heading) {
    const idx = md.indexOf(heading[0]);
    const after = md.slice(idx + heading[0].length);
    const nextH2 = after.search(/^##\s+/m);
    const transcript = (nextH2 === -1 ? after : after.slice(0, nextH2)).trim();
    const main = (md.slice(0, idx) + (nextH2 === -1 ? "" : after.slice(nextH2))).trim();
    return { main, transcript, title: cleanTitle(heading[0].replace(/^##\s+/, "")) };
  }

  return { main: md, transcript: null, title: "Transcripción completa" };
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg sm:text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-foreground mt-6 mb-2.5 pb-1.5 border-b border-white/5 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-foreground mt-4 mb-1.5">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-foreground/90 leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children, className }) => (
    <ul
      className={
        className?.includes("contains-task-list")
          ? "space-y-2 mb-4"
          : "list-disc list-outside ml-5 space-y-1.5 mb-4 marker:text-primary"
      }
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 space-y-1.5 mb-4 marker:text-primary marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children, className }) =>
    className?.includes("task-list-item") ? (
      <li className="flex items-start gap-2.5 text-sm text-foreground/90 list-none leading-relaxed">
        {children}
      </li>
    ) : (
      <li className="text-sm text-foreground/90 leading-relaxed pl-1">{children}</li>
    ),
  input: ({ checked }) => (
    <span
      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
        checked ? "bg-success/20 border-success" : "border-white/25 bg-white/5"
      }`}
    >
      {checked && <Check className="w-3 h-3 text-success" />}
    </span>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 bg-primary/5 rounded-r px-3 py-2 text-sm text-muted-foreground mb-4">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline decoration-primary/40 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 rounded bg-white/5 text-primary text-[0.8em] font-mono">
      {children}
    </code>
  ),
  hr: () => <hr className="border-white/5 my-5" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4 rounded-lg border border-white/10">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold text-foreground bg-white/5 px-3 py-2 border-b border-white/10">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-white/5 text-foreground/90 align-top">
      {children}
    </td>
  ),
};

/** Collapsible section for the transcript block. */
function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg mt-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-3 py-3 border-t border-border max-h-72 overflow-y-auto"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

export default function NotePreview({ content, filename }: NotePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const triggerDownload = useCallback((blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadMarkdown = useCallback(() => {
    triggerDownload(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
      filename.endsWith(".md") ? filename : `${filename}.md`
    );
    setMenuOpen(false);
  }, [content, filename, triggerDownload]);

  const handleDownloadWord = useCallback(async () => {
    setDownloading(true);
    setDownloadError(false);
    try {
      const blob = await exportNoteDocx(content, filename);
      triggerDownload(blob, `${filename.replace(/\.md$/, "")}.docx`);
      setMenuOpen(false);
    } catch {
      setDownloadError(true);
      setTimeout(() => setDownloadError(false), 4000);
    } finally {
      setDownloading(false);
    }
  }, [content, filename, triggerDownload]);

  const { main, transcript, title } = extractTranscript(stripFrontmatter(content));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold uppercase tracking-wider text-xs text-slate-300">
              Nota Generada
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
              {filename}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900/60 border border-white/5 hover:bg-white/5 text-slate-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Copiar
              </>
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary/15 border border-primary/30 hover:bg-primary/25 text-primary transition-colors disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : downloadError ? (
                <AlertCircle className="w-3.5 h-3.5 text-danger" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Descargar
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 mt-1.5 w-56 z-20 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl overflow-hidden"
                >
                  <button
                    onClick={handleDownloadWord}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5 transition-colors"
                  >
                    <FileType2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>
                      Documento Word
                      <span className="block text-[10px] text-muted-foreground">
                        .docx · para compartir e imprimir
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-white/5 transition-colors border-t border-white/5"
                  >
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      Markdown
                      <span className="block text-[10px] text-muted-foreground">
                        .md · para Obsidian
                      </span>
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-950/40 rounded-lg p-4 sm:p-5 max-h-[60vh] overflow-y-auto border border-white/5">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {main}
        </ReactMarkdown>

        {transcript && (
          <CollapsibleSection title={title}>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {transcript}
            </p>
          </CollapsibleSection>
        )}
      </div>
    </motion.div>
  );
}
