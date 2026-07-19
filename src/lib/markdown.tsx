import type { ReactNode } from "react";

// Minimal, dependency-free Markdown rendering for node content and drafts:
// headings, unordered lists, bold, paragraphs. One shared block parser feeds
// two renderers: the React component (React escapes all text, so no raw-HTML
// injection surface) and the HTML-string serializer used by the export
// renderer stub. The full renderer (Quartz publishing) is V1.

type Block =
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

/** `**bold**` split shared by both renderers: odd indices are bold runs. */
function boldRuns(text: string): string[] {
  return text.split(/\*\*(.+?)\*\*/g);
}

function inline(text: string): ReactNode[] {
  return boldRuns(text).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="md-content">
      {parseBlocks(content).map((block, key) =>
        block.type === "ul" ? (
          <ul key={key}>
            {block.items.map((item, i) => (
              <li key={i}>{inline(item)}</li>
            ))}
          </ul>
        ) : block.type === "p" ? (
          <p key={key}>{inline(block.text)}</p>
        ) : (
          (() => {
            const H = block.type;
            return <H key={key}>{inline(block.text)}</H>;
          })()
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTML string serializer (export renderer stub) — same parse, escaped output.
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineHtml(text: string): string {
  return boldRuns(text)
    .map((part, i) => (i % 2 === 1 ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part)))
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
