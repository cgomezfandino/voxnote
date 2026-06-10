"use client";

import { motion } from "framer-motion";
import { FileText, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";

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

/** Collapsible section for <details>/<summary> blocks. */
function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg mt-3 overflow-hidden">
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
          className="px-3 py-3 border-t border-border max-h-64 overflow-y-auto"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

export default function NotePreview({ content, filename }: NotePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const body = stripFrontmatter(content);

  // Simple markdown-to-html renderer for preview
  const renderMarkdown = (md: string) => {
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let i = 0;
    const lines = md.split("\n");

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul
            key={`list-${elements.length}`}
            className="list-disc list-inside space-y-0.5 mb-3"
          >
            {listItems.map((item, j) => (
              <li key={j} className="text-sm text-foreground">
                {item}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    while (i < lines.length) {
      const trimmed = lines[i].trim();

      // Handle <details> blocks → collapsible section
      if (trimmed.startsWith("<details")) {
        flushList();
        // Extract summary text
        let summaryText = "Ver contenido";
        i++;
        while (i < lines.length) {
          const line = lines[i].trim();
          if (line.startsWith("<summary>")) {
            summaryText = line
              .replace(/<\/?summary>/g, "")
              .replace(/<\/?b>/g, "")
              .trim();
            i++;
            break;
          }
          if (line === "</details>") break;
          i++;
        }

        // Collect inner content until </details>
        const innerLines: string[] = [];
        while (i < lines.length) {
          const line = lines[i].trim();
          if (line === "</details>") {
            i++;
            break;
          }
          innerLines.push(lines[i]);
          i++;
        }

        const innerContent = innerLines.join("\n").trim();
        elements.push(
          <CollapsibleSection
            key={`details-${elements.length}`}
            title={summaryText}
          >
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {innerContent}
            </p>
          </CollapsibleSection>
        );
        continue;
      }

      // Skip standalone HTML tags
      if (
        trimmed.startsWith("</") ||
        trimmed === "<summary>" ||
        trimmed === "</summary>"
      ) {
        i++;
        continue;
      }

      // Headings
      if (trimmed.startsWith("## ")) {
        flushList();
        const headingText = trimmed.slice(3);

        // Auto-collapse "Transcripción Completa" heading
        if (/transcripci[oó]n/i.test(headingText)) {
          const innerLines: string[] = [];
          i++;
          while (i < lines.length) {
            // Stop if we hit another h2 heading or end of content
            if (lines[i].trim().startsWith("## ")) break;
            innerLines.push(lines[i]);
            i++;
          }
          const innerContent = innerLines.join("\n").trim();
          if (innerContent) {
            elements.push(
              <CollapsibleSection
                key={`transcript-${elements.length}`}
                title={headingText}
              >
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {innerContent}
                </p>
              </CollapsibleSection>
            );
          }
          continue;
        }

        elements.push(
          <h2
            key={`h2-${elements.length}`}
            className="text-base font-semibold text-foreground mt-4 mb-2"
          >
            {headingText}
          </h2>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("### ")) {
        flushList();
        elements.push(
          <h3
            key={`h3-${elements.length}`}
            className="text-sm font-semibold text-foreground mt-3 mb-1.5"
          >
            {trimmed.slice(4)}
          </h3>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(
          <h1
            key={`h1-${elements.length}`}
            className="text-lg font-bold text-foreground mt-4 mb-2"
          >
            {trimmed.slice(2)}
          </h1>
        );
        i++;
        continue;
      }

      // List items
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.slice(2));
        i++;
        continue;
      }

      // Numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        listItems.push(trimmed.replace(/^\d+\.\s/, ""));
        i++;
        continue;
      }

      // Checkbox items (- [ ] task)
      if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
        const checked = trimmed.startsWith("- [x] ");
        listItems.push((checked ? "\u2611 " : "\u2610 ") + trimmed.slice(6));
        i++;
        continue;
      }

      // Blockquote
      if (trimmed.startsWith("> ")) {
        flushList();
        elements.push(
          <blockquote
            key={`bq-${elements.length}`}
            className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground italic mb-3"
          >
            {trimmed.slice(2)}
          </blockquote>
        );
        i++;
        continue;
      }

      // Horizontal rule
      if (trimmed === "---" || trimmed === "***") {
        flushList();
        elements.push(
          <hr key={`hr-${elements.length}`} className="border-border my-4" />
        );
        i++;
        continue;
      }

      // Empty line
      if (trimmed === "") {
        flushList();
        i++;
        continue;
      }

      // Paragraph
      flushList();
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="text-sm text-foreground mb-2"
        >
          {trimmed}
        </p>
      );
      i++;
    }

    flushList();
    return elements;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-wider text-xs text-slate-300">
              Nota Generada
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{filename}</p>
          </div>
        </div>

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
      </div>

      {/* Content */}
      <div className="bg-slate-950/40 rounded-lg p-4 max-h-[500px] overflow-y-auto border border-white/5">
        {renderMarkdown(body)}
      </div>
    </motion.div>
  );
}
