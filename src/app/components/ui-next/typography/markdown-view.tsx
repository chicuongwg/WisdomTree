import { Fragment, type ReactNode } from "react";
import {
  parseBlocks,
  inlineTokens,
  type Block,
  type Inline,
  type ListItem,
} from "@/lib/markdown-core";
import { normalizeTitle } from "@/lib/wikilink";
import { classNames } from "../shared";

export interface MarkdownViewProps {
  content: string;
  className?: string;
  dir?: "auto" | "ltr" | "rtl";
}

function renderInline(token: Inline, index: number): ReactNode {
  switch (token.kind) {
    case "text":
      return <Fragment key={index}>{token.text}</Fragment>;
    case "bold":
      return <strong key={index}>{token.text}</strong>;
    case "italic":
      return <em key={index}>{token.text}</em>;
    case "code":
      return <code key={index}>{token.text}</code>;
    case "wiki":
      return (
        <span key={index} className="ui-next-wiki-link" title={token.target}>
          {token.label}
        </span>
      );
    case "link":
      return (
        <a
          key={index}
          href={token.href}
          rel={token.external ? "noopener noreferrer" : undefined}
          target={token.external ? "_blank" : undefined}
        >
          {token.label}
        </a>
      );
    case "image":
      return token.allowed ? (
        <img key={index} src={token.src} alt={token.alt} />
      ) : (
        <span key={index} className="ui-next-image-blocked">
          {token.alt || "External image blocked"}
        </span>
      );
  }
}

function renderInlines(text: string): ReactNode {
  return inlineTokens(text).map((token, idx) => renderInline(token, idx));
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.type) {
    case "heading": {
      const id = normalizeTitle(block.text).replace(/\s+/g, "-");
      const inlines = renderInlines(block.text);
      switch (block.level) {
        case 1:
          return (
            <h1 key={index} id={id}>
              {inlines}
            </h1>
          );
        case 2:
          return (
            <h2 key={index} id={id}>
              {inlines}
            </h2>
          );
        case 3:
          return (
            <h3 key={index} id={id}>
              {inlines}
            </h3>
          );
        case 4:
          return (
            <h4 key={index} id={id}>
              {inlines}
            </h4>
          );
        case 5:
          return (
            <h5 key={index} id={id}>
              {inlines}
            </h5>
          );
        case 6:
          return (
            <h6 key={index} id={id}>
              {inlines}
            </h6>
          );
      }
      break;
    }
    case "p":
      return <p key={index}>{renderInlines(block.text)}</p>;
    case "ul":
      return (
        <ul key={index}>
          {block.items.map((item: ListItem, itemIdx: number) => (
            <li key={itemIdx}>
              {item.checked !== undefined ? (
                <input type="checkbox" disabled checked={item.checked} />
              ) : null}{" "}
              {renderInlines(item.text)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index}>
          {block.items.map((item: ListItem, itemIdx: number) => (
            <li key={itemIdx}>{renderInlines(item.text)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote key={index}>
          {block.blocks.map((inner, innerIdx) => renderBlock(inner, innerIdx))}
        </blockquote>
      );
    case "code":
      return (
        <div key={index} className="ui-next-code-block">
          {block.title ? <div className="ui-next-code-title">{block.title}</div> : null}
          <pre>
            <code className={block.language ? `language-${block.language}` : undefined}>
              {block.code}
            </code>
          </pre>
        </div>
      );
    case "table":
      return (
        <table key={index}>
          <thead>
            <tr>
              {block.headers.map((header, hIdx) => (
                <th key={hIdx}>{renderInlines(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{renderInlines(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "hr":
      return <hr key={index} />;
    case "admonition":
      return (
        <aside
          key={index}
          className={classNames("ui-next-admonition", `ui-next-admonition--${block.kind}`)}
        >
          {block.title ? <strong>{block.title}</strong> : null}
          {block.blocks.map((inner, innerIdx) => renderBlock(inner, innerIdx))}
        </aside>
      );
    case "details":
      return (
        <details key={index}>
          <summary>{block.title}</summary>
          {block.blocks.map((inner, innerIdx) => renderBlock(inner, innerIdx))}
        </details>
      );
    case "embed":
      return (
        <aside key={index} className="ui-next-internal-embed">
          {block.target}
        </aside>
      );
    case "tabs":
      return (
        <div key={index} className="ui-next-doc-tabs">
          {block.items.map((tabItem, tabIdx) => (
            <details key={tabIdx}>
              <summary>{tabItem.label}</summary>
              {tabItem.blocks.map((inner, innerIdx) => renderBlock(inner, innerIdx))}
            </details>
          ))}
        </div>
      );
  }
}

export function MarkdownView({ content, className, dir = "auto" }: MarkdownViewProps) {
  const blocks = parseBlocks(content);
  return (
    <div className={classNames("ui-next-markdown-view", className)} dir={dir}>
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}
