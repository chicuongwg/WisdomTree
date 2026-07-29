import type { ReactNode } from "react";
import { inlineTokens, parseBlocks } from "./markdown-core";
import { NodeLink } from "@/app/components/node-link";
import { T } from "./vi";

// React rendering for node content and drafts. Parsing lives in
// markdown-core.ts (shared with the export serializer); this file only turns
// tokens into elements. React escapes all text, so there is no raw-HTML
// injection surface.
//
// Wiki-links: pass `wikiIndex` (normalized title → node) and every
// `[[Tiêu đề]]` resolves to an in-app node link with a hover/focus preview.
// A target with no page renders as a visibly distinct non-link, so the
// reader can tell "not written yet" from "broken".

export { parseBlocks, markdownToHtml } from "./markdown-core";

export type WikiIndex = Record<
  string,
  { id: string; title: string; verification: string; kind?: "node" | "source" }
>;

function inline(text: string, wikiIndex: WikiIndex): ReactNode[] {
  return inlineTokens(text).map((token, i) => {
    if (token.kind === "bold") return <strong key={i}>{token.text}</strong>;
    if (token.kind === "text") return <span key={i}>{token.text}</span>;
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
        <a
          key={i}
          href={`/library/${target.id}`}
          className="wiki-link source-link"
          title={`${target.title} — ${T.library}`}
        >
          <span className="node-state source" aria-hidden="true">
            ●
          </span>
          {token.label}
        </a>
      );
    }
    return (
      <NodeLink
        key={i}
        nodeId={target.id}
        className="wiki-link"
        verification={target.verification}
      >
        {token.label}
      </NodeLink>
    );
  });
}

export function Markdown({ content, wikiIndex = {} }: { content: string; wikiIndex?: WikiIndex }) {
  return (
    <div className="md-content">
      {parseBlocks(content).map((block, key) =>
        block.type === "ul" ? (
          <ul key={key}>
            {block.items.map((item, i) => (
              <li key={i}>{inline(item, wikiIndex)}</li>
            ))}
          </ul>
        ) : block.type === "p" ? (
          <p key={key}>{inline(block.text, wikiIndex)}</p>
        ) : (
          (() => {
            const H = block.type;
            return <H key={key}>{inline(block.text, wikiIndex)}</H>;
          })()
        ),
      )}
    </div>
  );
}
