/**
 * Browser-side note generation — a faithful TypeScript port of the Python
 * `voxnote.pipeline.exporter.export_obsidian` so notes produced in the web (no backend)
 * are byte-identical in structure to the ones the local CLI writes, and stay
 * Obsidian-compatible.
 *
 * Differences from the Python version:
 *  - No filesystem: returns `{ filename, content }` instead of writing a file.
 *  - `audio_filename` is the original upload/recording name (no server-side path).
 */

import type { InsightsResult, ExportResult } from "@/types";

function asList(value: unknown): unknown[] {
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function bullets(values: unknown, empty: string): string {
  const items = asList(values)
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  return items.length ? items.map((v) => `- ${v}`).join("\n") : `- ${empty}`;
}

export interface ExportNoteOptions {
  audioFilename?: string;
}

export function exportNote(
  transcript: string,
  insights: InsightsResult,
  audioFilename: string = "recording.wav",
): ExportResult {
  const slug = audioFilename.replace(/\.[^.]+$/, "");

  // Match the Python slug format YYYY-MM-DD_HH-MM-SS_title
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})_(.*)$/);
  const now = new Date();
  let dateStr: string;
  let timeStr: string;
  let titleSlug: string;
  let noteFilename: string;
  if (match) {
    dateStr = match[1];
    timeStr = `${match[2]}:${match[3]}`;
    titleSlug = match[5];
    noteFilename = `${slug}.md`;
  } else {
    const pad = (n: number) => String(n).padStart(2, "0");
    dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    titleSlug = slug;
    noteFilename = `${dateStr}_${slug}.md`;
  }

  // Action items → task list with owner/deadline
  let tasks = "";
  for (const item of asList(insights.action_items)) {
    if (typeof item !== "object" || item === null) continue;
    const it = item as { task?: string; owner?: string; deadline?: string };
    if (!it.task) continue;
    const owner = it.owner || "TBD";
    const deadline = it.deadline || "TBD";
    tasks += `- [ ] ${it.task} @${owner} (deadline: ${deadline})\n`;
  }
  const tasksMd = tasks.trim() || "- [ ] No tasks identified";

  const participantsRows: string[] = [];
  for (const p of asList(insights.participants)) {
    if (typeof p === "object" && p !== null) {
      const pp = p as { speaker?: string; contribution?: string };
      if (pp.speaker) {
        participantsRows.push(
          `**${pp.speaker}**` + (pp.contribution ? ` — ${pp.contribution}` : ""),
        );
      }
    } else if (typeof p === "string" && p.trim()) {
      participantsRows.push(`**${p.trim()}**`);
    }
  }

  const highlightsRows: string[] = [];
  for (const c of asList(insights.highlights)) {
    if (typeof c === "object" && c !== null) {
      const cc = c as { speaker?: string; quote?: string };
      if (cc.quote) {
        const prefix = cc.speaker ? `**${cc.speaker}:** ` : "";
        highlightsRows.push(`> ${prefix}${cc.quote}`);
      }
    } else if (typeof c === "string" && c.trim()) {
      highlightsRows.push(`> ${c.trim()}`);
    }
  }

  const decisions = bullets(insights.decisions, "None");
  const insightLines = bullets(insights.insights, "None");
  const questions = bullets(insights.open_questions, "None");
  const nextSteps = bullets(insights.next_steps, "None");

  const sections: string[] = [`## 📝 Summary\n\n${insights.summary || "N/A"}`];
  if (participantsRows.length) sections.push(`## 👥 Participants\n\n${participantsRows.join("\n")}`);
  if (insights.key_points && insights.key_points.length) {
    sections.push(`## 📌 Key points\n\n${bullets(insights.key_points, "")}`);
  }
  sections.push(`## ✅ Decisions\n\n${decisions}`);
  sections.push(`## 🎯 Action items\n\n${tasksMd}`);
  sections.push(`## 💡 Insights\n\n${insightLines}`);
  if (highlightsRows.length) sections.push(`## 💬 Highlights\n\n${highlightsRows.join("\n")}`);
  sections.push(`## ❓ Open questions\n\n${questions}`);
  sections.push(`## 🔜 Next steps\n\n${nextSteps}`);
  const body = sections.join("\n\n---\n\n");

  const audioName = audioFilename.split("/").pop() || audioFilename;

  const content = `---
tags: [meeting, ${dateStr}]
date: ${dateStr}
time: ${timeStr}
audio: "[[audio/${audioName}]]"
---

# 📋 Meeting — ${titleSlug}

> 🗓️ **Date:** ${dateStr} · ⏰ **Time:** ${timeStr} · 🎧 \`${audioName}\`

---

${body}

---

<details>
<summary>📄 Full transcript</summary>

${transcript}

</details>
`;

  // path is irrelevant in the browser; kept for type compatibility with ExportResult.
  return { filename: noteFilename, content, path: noteFilename };
}
