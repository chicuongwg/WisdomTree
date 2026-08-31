// Dependency-free, safe Markdown parsing shared by the React reader and the
// static export renderer. Raw HTML is never interpreted; renderers escape all
// text. The directive subset mirrors useful documentation affordances without
// allowing MDX or arbitrary components.

import { normalizeTitle } from "./wikilink";

export type ListItem = { text: string; checked?: boolean };
export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: ListItem[] }
  | { type: "ol"; items: ListItem[] }
  | { type: "quote"; blocks: Block[] }
  | { type: "code"; code: string; language: string | null; title: string | null }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" }
  | {
      type: "admonition";
      kind: "note" | "tip" | "info" | "warning" | "danger";
      title: string | null;
      blocks: Block[];
    }
  | { type: "details"; title: string; blocks: Block[] }
  | { type: "embed"; target: string; key: string }
  | { type: "tabs"; items: Array<{ label: string; blocks: Block[] }> };

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function directiveEnd(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i++) if (lines[i].trim() === ":::") return i;
  return lines.length;
}

export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: ListItem[] = [];
  let listType: "ul" | "ol" = "ul";

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (list.length) {
      blocks.push({ type: listType, items: list });
      list = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^[-*+]\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    const fence = /^```([^\s]*)?(?:\s+title="([^"]+)")?\s*$/.exec(line);
    const directive = /^:::(note|tip|info|warning|danger|details)(?:\[([^\]]+)\])?\s*$/.exec(line);
    const embed = /^!\[\[([^[\]|]+)\]\]\s*$/.exec(line);

    if (embed) {
      flush();
      const target = embed[1].trim();
      blocks.push({ type: "embed", target, key: normalizeTitle(target) });
    } else if (fence) {
      flush();
      const code: string[] = [];
      for (i += 1; i < lines.length && !/^```\s*$/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ type: "code", code: code.join("\n"), language: fence[1] || null, title: fence[2] || null });
    } else if (directive) {
      flush();
      const end = directiveEnd(lines, i + 1);
      const inner = parseBlocks(lines.slice(i + 1, end).join("\n"));
      if (directive[1] === "details") {
        blocks.push({ type: "details", title: directive[2] || "Chi tiết", blocks: inner });
      } else {
        blocks.push({
          type: "admonition",
          kind: directive[1] as "note" | "tip" | "info" | "warning" | "danger",
          title: directive[2] || null,
          blocks: inner,
        });
      }
      i = end;
    } else if (/^:::tabs\s*$/.test(line)) {
      flush();
      const end = directiveEnd(lines, i + 1);
      const items: Array<{ label: string; blocks: Block[] }> = [];
      let label: string | null = null;
      let body: string[] = [];
      for (const tabLine of lines.slice(i + 1, end)) {
        const tab = /^::tab\[([^\]]+)\]\s*$/.exec(tabLine);
        if (tab) {
          if (label) items.push({ label, blocks: parseBlocks(body.join("\n")) });
          label = tab[1].trim();
          body = [];
        } else if (label) body.push(tabLine);
      }
      if (label) items.push({ label, blocks: parseBlocks(body.join("\n")) });
      if (items.length) blocks.push({ type: "tabs", items });
      i = end;
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: heading[2] });
    } else if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      flush();
      blocks.push({ type: "hr" });
    } else if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flush();
      const headers = tableCells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(tableCells(lines[i]));
        i++;
      }
      i--;
      blocks.push({ type: "table", headers, rows });
    } else if (/^>\s?/.test(line)) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      i--;
      blocks.push({ type: "quote", blocks: parseBlocks(quoted.join("\n")) });
    } else if (bullet || ordered) {
      if (paragraph.length || (list.length && listType !== (bullet ? "ul" : "ol"))) flush();
      listType = bullet ? "ul" : "ol";
      list.push(bullet ? { text: bullet[2], ...(bullet[1] ? { checked: bullet[1].toLowerCase() === "x" } : {}) } : { text: ordered![1] });
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

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "wiki"; target: string; key: string; label: string }
  | { kind: "link"; label: string; href: string; external: boolean }
  | { kind: "image"; alt: string; src: string; allowed: boolean };

// Escaped brackets keep the wiki-link groups visually auditable.
// eslint-disable-next-line no-useless-escape
const INLINE_TOKEN = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]|!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^\s)]+)\)|\*\*(.+?)\*\*|`([^`]+)`|(?<!\*)\*([^*\n]+)\*(?!\*)/g;

export function safeHref(href: string): { href: string; external: boolean } | null {
  if (href.startsWith("/") || href.startsWith("#")) return { href, external: false };
  if (/^(https?:|mailto:)/i.test(href)) return { href, external: true };
  return null;
}

export function isAllowedImageSource(src: string): boolean {
  return src.startsWith("/api/blob/") || src.startsWith("/api/avatar/");
}

export function inlineTokens(text: string): Inline[] {
  const tokens: Inline[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_TOKEN)) {
    const at = match.index ?? 0;
    if (at > cursor) tokens.push({ kind: "text", text: text.slice(cursor, at) });
    if (match[1]) {
      const target = match[1].trim();
      tokens.push({ kind: "wiki", target, key: normalizeTitle(target), label: (match[2] || match[1]).trim() });
    } else if (match[3] !== undefined) {
      tokens.push({ kind: "image", alt: match[3], src: match[4], allowed: isAllowedImageSource(match[4]) });
    } else if (match[5] !== undefined) {
      const safe = safeHref(match[6]);
      tokens.push(safe ? { kind: "link", label: match[5], ...safe } : { kind: "text", text: match[0] });
    } else if (match[7] !== undefined) tokens.push({ kind: "bold", text: match[7] });
    else if (match[8] !== undefined) tokens.push({ kind: "code", text: match[8] });
    else tokens.push({ kind: "italic", text: match[9] });
    cursor = at + match[0].length;
  }
  if (cursor < text.length) tokens.push({ kind: "text", text: text.slice(cursor) });
  return tokens;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineHtml(text: string): string {
  return inlineTokens(text).map((token) => {
    if (token.kind === "bold") return `<strong>${escapeHtml(token.text)}</strong>`;
    if (token.kind === "italic") return `<em>${escapeHtml(token.text)}</em>`;
    if (token.kind === "code") return `<code>${escapeHtml(token.text)}</code>`;
    if (token.kind === "wiki") return escapeHtml(token.label);
    if (token.kind === "link") return `<a href="${escapeHtml(token.href)}"${token.external ? ' rel="noopener noreferrer"' : ""}>${escapeHtml(token.label)}</a>`;
    if (token.kind === "image") return token.allowed ? `<img src="${escapeHtml(token.src)}" alt="${escapeHtml(token.alt)}">` : `<span class="image-blocked">${escapeHtml(token.alt || "Ảnh ngoài hệ thống đã bị chặn")}</span>`;
    return escapeHtml(token.text);
  }).join("");
}

function blocksHtml(blocks: Block[]): string {
  return blocks.map((block) => {
    if (block.type === "heading") {
      const id = normalizeTitle(block.text).replace(/\s+/g, "-");
      return `<h${block.level} id="${escapeHtml(id)}">${inlineHtml(block.text)}</h${block.level}>`;
    }
    if (block.type === "p") return `<p>${inlineHtml(block.text)}</p>`;
    if (block.type === "ul" || block.type === "ol") return `<${block.type}>${block.items.map((item) => `<li>${item.checked === undefined ? "" : `<input type="checkbox" disabled${item.checked ? " checked" : ""}> `}${inlineHtml(item.text)}</li>`).join("")}</${block.type}>`;
    if (block.type === "quote") return `<blockquote>${blocksHtml(block.blocks)}</blockquote>`;
    if (block.type === "code") return `${block.title ? `<div class="code-title">${escapeHtml(block.title)}</div>` : ""}<pre><code${block.language ? ` class="language-${escapeHtml(block.language)}"` : ""}>${escapeHtml(block.code)}</code></pre>`;
    if (block.type === "table") return `<table><thead><tr>${block.headers.map((cell) => `<th>${inlineHtml(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    if (block.type === "hr") return "<hr>";
    if (block.type === "admonition") return `<aside class="admonition ${block.kind}">${block.title ? `<strong>${escapeHtml(block.title)}</strong>` : ""}${blocksHtml(block.blocks)}</aside>`;
    if (block.type === "details") return `<details><summary>${escapeHtml(block.title)}</summary>${blocksHtml(block.blocks)}</details>`;
    if (block.type === "embed") return `<aside class="internal-embed">${escapeHtml(block.target)}</aside>`;
    return `<div class="doc-tabs">${block.items.map((item) => `<details><summary>${escapeHtml(item.label)}</summary>${blocksHtml(item.blocks)}</details>`).join("")}</div>`;
  }).join("\n");
}

export function markdownToHtml(content: string): string {
  return blocksHtml(parseBlocks(content));
}
