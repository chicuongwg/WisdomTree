// Dependency-free Markdown parsing shared by every renderer: the React
// component (src/lib/markdown.tsx) and the HTML-string serializer used by the
// export renderer. Kept free of React and of any "use client" import so the
// export job can pull it in outside a render context.
//
// Supported: headings (#…###), unordered lists, `**bold**`, paragraphs, and
// wiki-links `[[Tiêu đề]]` / `[[Tiêu đề|nhãn]]`. The full renderer (Quartz
// publishing) is V1.

import { normalizeTitle } from "./wikilink";

export type Block =
  | { type: "h1" | "h2" | "h3" | "p"; text: string }
  | { type: "ul"; items: string[] };

export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (list.length) {
      blocks.push({ type: "ul", items: list });
      list = [];
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: (["h1", "h2", "h3"] as const)[heading[1].length - 1], text: heading[2] });
    } else if (bullet) {
      if (paragraph.length) flush();
      list.push(bullet[1]);
    } else if (!line.trim()) {
      flush();
    } else {
      if (list.length) flush();
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

// --- Inline tokens ---------------------------------------------------------
// One tokenizer feeds both renderers: wiki-links first (they may contain any
// characters but the delimiters), then `**bold**` inside the plain runs.

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "wiki"; target: string; key: string; label: string };

const WIKI_LINK = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;

/** `**bold**` split shared by both renderers: odd indices are bold runs. */
function boldTokens(text: string): Inline[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map<Inline>((part, i) => (i % 2 === 1 ? { kind: "bold", text: part } : { kind: "text", text: part }))
    .filter((t) => t.kind !== "text" || t.text !== "");
}

export function inlineTokens(text: string): Inline[] {
  const tokens: Inline[] = [];
  let cursor = 0;
  for (const m of text.matchAll(WIKI_LINK)) {
    const at = m.index ?? 0;
    if (at > cursor) tokens.push(...boldTokens(text.slice(cursor, at)));
    const target = m[1].trim();
    tokens.push({
      kind: "wiki",
      target,
      key: normalizeTitle(target),
      label: (m[2] ?? m[1]).trim(),
    });
    cursor = at + m[0].length;
  }
  if (cursor < text.length) tokens.push(...boldTokens(text.slice(cursor)));
  return tokens;
}

// ---------------------------------------------------------------------------
// HTML string serializer (export renderer) — same parse, escaped output.
// Wiki-links serialize to their display label: the export target is a
// standalone artifact with no app routes to point at.
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(text: string): string {
  return inlineTokens(text)
    .map((t) =>
      t.kind === "bold"
        ? `<strong>${escapeHtml(t.text)}</strong>`
        : t.kind === "wiki"
          ? escapeHtml(t.label)
          : escapeHtml(t.text),
    )
    .join("");
}

/** Render node Markdown to an HTML fragment through the same block parser. */
export function markdownToHtml(content: string): string {
  return parseBlocks(content)
    .map((block) =>
      block.type === "ul"
        ? `<ul>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join("")}</ul>`
        : `<${block.type}>${inlineHtml(block.text)}</${block.type}>`,
    )
    .join("\n");
}
