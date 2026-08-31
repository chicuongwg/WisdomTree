import type { ReactNode } from "react";
import { inlineTokens, parseBlocks, type Block } from "./markdown-core";
import { NodeLink } from "@/app/components/node-link";
import { T } from "./vi";
import { normalizeTitle } from "./wikilink";

export { parseBlocks, markdownToHtml } from "./markdown-core";

export type WikiIndex = Record<
  string,
  { id: string; title: string; verification: string; kind?: "node" | "source" }
>;

function inline(text: string, wikiIndex: WikiIndex): ReactNode[] {
  return inlineTokens(text).map((token, i) => {
    if (token.kind === "bold") return <strong key={i}>{token.text}</strong>;
    if (token.kind === "italic") return <em key={i}>{token.text}</em>;
    if (token.kind === "code") return <code key={i}>{token.text}</code>;
    if (token.kind === "text") return <span key={i}>{token.text}</span>;
    if (token.kind === "link") {
      return (
        <a key={i} href={token.href} {...(token.external ? { rel: "noopener noreferrer" } : {})}>
          {token.label}
        </a>
      );
    }
    if (token.kind === "image") {
      return token.allowed ? (
        // Safe paths are authenticated in-app endpoints, not arbitrary hosts.
        <img key={i} src={token.src} alt={token.alt} />
      ) : (
        <span key={i} className="image-blocked" title="Ảnh ngoài hệ thống đã bị chặn">
          {token.alt || "Ảnh ngoài hệ thống đã bị chặn"}
        </span>
      );
    }
    const target = wikiIndex[token.key];
    if (!target) {
      return (
        <span key={i} className="wiki-missing" title={T.wikiMissing} aria-label={`${token.label} — ${T.wikiMissing}`}>
          {token.label}
        </span>
      );
    }
    if (target.kind === "source" || target.verification === "source") {
      return (
        <a key={i} href={`/library/${target.id}`} className="wiki-link source-link" title={`${target.title} — ${T.library}`}>
          <span className="node-state source" aria-hidden="true">●</span>
          {token.label}
        </a>
      );
    }
    return <NodeLink key={i} nodeId={target.id} className="wiki-link" verification={target.verification}>{token.label}</NodeLink>;
  });
}

function renderBlocks(blocks: Block[], wikiIndex: WikiIndex, prefix = "md"): ReactNode[] {
  return blocks.map((block, key) => {
    const id = `${prefix}-${key}`;
    if (block.type === "heading") {
      const H = `h${block.level}` as keyof React.JSX.IntrinsicElements;
      return <H key={id} id={normalizeTitle(block.text).replace(/\s+/g, "-")}>{inline(block.text, wikiIndex)}</H>;
    }
    if (block.type === "p") return <p key={id}>{inline(block.text, wikiIndex)}</p>;
    if (block.type === "ul" || block.type === "ol") {
      const List = block.type;
      return (
        <List key={id}>
          {block.items.map((item, i) => (
            <li key={i}>
              {item.checked !== undefined && <input type="checkbox" checked={item.checked} readOnly aria-label={item.checked ? "Đã hoàn thành" : "Chưa hoàn thành"} />} {inline(item.text, wikiIndex)}
            </li>
          ))}
        </List>
      );
    }
    if (block.type === "quote") return <blockquote key={id}>{renderBlocks(block.blocks, wikiIndex, id)}</blockquote>;
    if (block.type === "code") {
      return (
        <div key={id} className="code-block">
          {block.title && <div className="code-title">{block.title}</div>}
          <pre><code className={block.language ? `language-${block.language}` : undefined}>{block.code}</code></pre>
        </div>
      );
    }
    if (block.type === "table") {
      return (
        <div key={id} className="table-scroll"><table><thead><tr>{block.headers.map((cell, i) => <th key={i}>{inline(cell, wikiIndex)}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{inline(cell, wikiIndex)}</td>)}</tr>)}</tbody></table></div>
      );
    }
    if (block.type === "hr") return <hr key={id} />;
    if (block.type === "admonition") return <aside key={id} className={`admonition ${block.kind}`}>{block.title && <strong className="admonition-title">{block.title}</strong>}{renderBlocks(block.blocks, wikiIndex, id)}</aside>;
    if (block.type === "details") return <details key={id}><summary>{block.title}</summary>{renderBlocks(block.blocks, wikiIndex, id)}</details>;
    return <div key={id} className="doc-tabs">{block.items.map((item, i) => <details key={i} open={i === 0}><summary>{item.label}</summary>{renderBlocks(item.blocks, wikiIndex, `${id}-${i}`)}</details>)}</div>;
  });
}

export function Markdown({ content, wikiIndex = {} }: { content: string; wikiIndex?: WikiIndex }) {
  return <div className="md-content">{renderBlocks(parseBlocks(content), wikiIndex)}</div>;
}
