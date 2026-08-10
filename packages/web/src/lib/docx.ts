/**
 * Render a Voxnote Markdown note as a Word (.docx) document in the browser.
 *
 * TypeScript port of `voxnote.pipeline.docx_exporter.markdown_to_docx`. Same parsing
 * rules (headings, bullets, task table, blockquotes, transcript <details>), so the
 * browser output matches what the Python backend produced. Uses the `docx` npm package,
 * which generates valid OpenXML entirely client-side.
 */

import {
  Document,
  Packer,
  HeadingLevel,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

const INVALID_XML = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
const TASK_RE = /^- \[[ xX]\]\s*(.*)$/;
const DEADLINE_RE = /\(deadline:\s*(.*?)\)\s*$/;
const OWNER_RE = /@(\S+)\s*$/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const NUMBERED_RE = /^\d+\.\s+(.*)$/;

function clean(text: string): string {
  return text.replace(INVALID_XML, "");
}

function inline(text: string): string {
  let out = text.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\[\[([^\]]+)\]\]/g, "$1");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  return out;
}

function text(value: string): string {
  return clean(inline(value)).trim();
}

function headingText(value: string): string {
  const stripped = text(value).replace(/^[\W_]+/, "").trim();
  return stripped || text(value);
}

function stripFrontmatter(markdown: string): string {
  if (markdown.startsWith("---")) {
    const end = markdown.indexOf("\n---", 3);
    if (end !== -1) {
      const newline = markdown.indexOf("\n", end + 1);
      return newline !== -1 ? markdown.slice(newline + 1) : "";
    }
  }
  return markdown;
}

function parseTask(inner: string): { task: string; owner: string; deadline: string } {
  let deadline = "";
  let owner = "";
  let rest = inner;
  const dl = DEADLINE_RE.exec(rest);
  if (dl) {
    deadline = dl[1].trim();
    rest = rest.slice(0, dl.index).trimEnd();
  }
  const ow = OWNER_RE.exec(rest);
  if (ow) {
    owner = ow[1].trim();
    rest = rest.slice(0, ow.index).trimEnd();
  }
  return { task: rest.trim(), owner, deadline };
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
};

export async function markdownToDocxBlob(markdown: string, _filename: string): Promise<Blob> {
  const lines = stripFrontmatter(markdown).split("\n");

  // Accumulate paragraphs/blocks in order, flushing grouped lists when a different
  // construct appears — mirrors the Python flush_bullets/numbered/tasks helpers.
  const children: (Paragraph | Table)[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];
  let tasks: { task: string; owner: string; deadline: string }[] = [];

  const flushBullets = () => {
    for (const item of bullets) {
      children.push(new Paragraph({ text: text(item), bullet: { level: 0 } }));
    }
    bullets = [];
  };
  const flushNumbered = () => {
    for (const item of numbered) {
      children.push(
        new Paragraph({
          text: text(item),
          numbering: { reference: "numbered-list", level: 0 },
        }),
      );
    }
    numbered = [];
  };
  const flushTasks = () => {
    if (tasks.length === 0) return;
    const header = new TableRow({
      tableHeader: true,
      children: ["Task", "Owner", "Deadline"].map(
        (label) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
            borders: tableBorders as never,
          }),
      ),
    });
    const rows = tasks.map(
      (t) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(text(t.task))],
              borders: tableBorders as never,
            }),
            new TableCell({
              children: [new Paragraph(text(t.owner) || "—")],
              borders: tableBorders as never,
            }),
            new TableCell({
              children: [new Paragraph(text(t.deadline) || "—")],
              borders: tableBorders as never,
            }),
          ],
        }),
    );
    children.push(
      new Table({
        rows: [header, ...rows],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders as never,
      }),
    );
    children.push(new Paragraph(""));
    tasks = [];
  };
  const flushAll = () => {
    flushBullets();
    flushNumbered();
    flushTasks();
  };

  let i = 0;
  while (i < lines.length) {
    const stripped = lines[i].trim();

    // Transcript collapsible block → heading + paragraphs.
    if (stripped.startsWith("<details")) {
      flushAll();
      let title = "Full transcript";
      i++;
      const inner: string[] = [];
      while (i < lines.length) {
        const line = lines[i].trim();
        if (line.startsWith("<summary>")) {
          title = headingText(line.replace(/<\/?summary>/g, ""));
          i++;
          continue;
        }
        if (line === "</details>") {
          i++;
          break;
        }
        inner.push(lines[i]);
        i++;
      }
      children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }));
      for (const block of inner.join("\n").trim().split("\n")) {
        if (block.trim()) children.push(new Paragraph(text(block)));
      }
      continue;
    }

    if (stripped.startsWith("</") || stripped === "<summary>" || stripped === "</summary>") {
      i++;
      continue;
    }

    const taskMatch = TASK_RE.exec(stripped);
    if (taskMatch) {
      flushBullets();
      flushNumbered();
      tasks.push(parseTask(taskMatch[1]));
      i++;
      continue;
    }

    if (stripped.startsWith("### ")) {
      flushAll();
      children.push(new Paragraph({ text: headingText(stripped.slice(4)), heading: HeadingLevel.HEADING_2 }));
      i++;
      continue;
    }
    if (stripped.startsWith("## ")) {
      flushAll();
      children.push(new Paragraph({ text: headingText(stripped.slice(3)), heading: HeadingLevel.HEADING_1 }));
      i++;
      continue;
    }
    if (stripped.startsWith("# ")) {
      flushAll();
      children.push(new Paragraph({ text: headingText(stripped.slice(2)), heading: HeadingLevel.TITLE }));
      i++;
      continue;
    }

    const bulletMatch = BULLET_RE.exec(stripped);
    if (bulletMatch) {
      flushNumbered();
      flushTasks();
      bullets.push(bulletMatch[1]);
      i++;
      continue;
    }

    const numberedMatch = NUMBERED_RE.exec(stripped);
    if (numberedMatch) {
      flushBullets();
      flushTasks();
      numbered.push(numberedMatch[1]);
      i++;
      continue;
    }

    if (stripped.startsWith("> ")) {
      flushAll();
      children.push(
        new Paragraph({
          children: [new TextRun({ text: text(stripped.slice(2)), italics: true })],
        }),
      );
      i++;
      continue;
    }

    // Horizontal rules / separators.
    if (stripped && /^[-*_]+$/.test(stripped)) {
      flushAll();
      i++;
      continue;
    }

    flushAll();
    children.push(new Paragraph(text(stripped)));
    i++;
  }
  flushAll();

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "numbered-list",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "start" as never,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
