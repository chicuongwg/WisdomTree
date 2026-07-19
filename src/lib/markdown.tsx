import type { ReactNode } from "react";

// Minimal, dependency-free Markdown rendering for node content and drafts:
// headings, unordered lists, bold, paragraphs. React escapes all text, so no
// raw-HTML injection surface. The full renderer (Quartz publishing) is V1.

function inline(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export function Markdown({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flush = () => {
    if (paragraph.length) {
      blocks.push(<p key={key++}>{inline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
    if (list.length) {
      blocks.push(
        <ul key={key++}>
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const H = (["h1", "h2", "h3"] as const)[heading[1].length - 1];
      blocks.push(<H key={key++}>{inline(heading[2])}</H>);
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
  return <div className="md-content">{blocks}</div>;
}
