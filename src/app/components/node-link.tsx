"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { T, verificationStateLabel } from "@/lib/vi";

// The one node link in the app. Every place a page is named — sidebar
// outline, graph, backlinks, outgoing links, wiki-links inside content,
// command-palette results — goes through this component, so hovering or
// tabbing to a page name always shows the same card: title, verification,
// ~200 characters of content.
//
// Accessibility: the card opens on pointer enter AND on keyboard focus
// (no hover-only affordance), closes on blur/leave/Escape, is described by
// aria-describedby, and never animates when the reader asks for reduced
// motion (the CSS honours prefers-reduced-motion).

export type NodePreview = {
  id: string;
  title: string;
  verification: string;
  excerpt: string;
};

// Module-level cache: one fetch per node id per page session, shared by every
// link that names it. Promises are cached too, so two links hovered in quick
// succession issue a single request.
const cache = new Map<string, NodePreview>();
const inflight = new Map<string, Promise<NodePreview | null>>();

export function loadPreview(nodeId: string): Promise<NodePreview | null> {
  const hit = cache.get(nodeId);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(nodeId);
  if (running) return running;
  const request = fetch(`/api/tree/nodes/${nodeId}/preview`)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as NodePreview;
      cache.set(nodeId, data);
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(nodeId));
  inflight.set(nodeId, request);
  return request;
}

/** Shared card body; positioned by whoever renders it. */
export function NodePreviewCard({
  preview,
  id,
  style,
}: {
  preview: NodePreview | null;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className="node-card" id={id} role="tooltip" style={style}>
      {preview ? (
        <>
          <span className="node-card-head">
            <span className="node-card-title">{preview.title}</span>
            <span className={`node-state ${preview.verification}`} aria-hidden="true">
              ●
            </span>
            <span className="node-card-state">{verificationStateLabel(preview.verification)}</span>
          </span>
          <span className="node-card-body">{preview.excerpt || T.empty}</span>
        </>
      ) : (
        <span className="node-card-body">{T.loading}</span>
      )}
    </span>
  );
}

/** Where the card goes for a given trigger: below it, flipped up near the
 * bottom edge, always inside the viewport. Shared by the hook and the map. */
export function cardPosition(target: Element): { top: number; left: number } {
  const rect = target.getBoundingClientRect();
  const width = 288; // matches --node-card-w in globals.css
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 8;
  const top = below + 160 > window.innerHeight ? Math.max(8, rect.top - 168) : below;
  return { top, left };
}

/**
 * Anchor-agnostic preview behaviour: returns the handlers to spread on any
 * focusable element plus the card to render. Used by NodeLink and by the
 * command palette, whose rows are buttons rather than links.
 */
export function useNodePreview(nodeId: string) {
  const [preview, setPreview] = useState<NodePreview | null>(null);
  const [openAt, setOpenAt] = useState<{ top: number; left: number } | null>(null);
  const cardId = useId();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const open = useCallback(
    (target: HTMLElement) => {
      setOpenAt(cardPosition(target));
      const cached = cache.get(nodeId);
      if (cached) setPreview(cached);
      else void loadPreview(nodeId).then((p) => alive.current && setPreview(p));
    },
    [nodeId],
  );
  const close = useCallback(() => setOpenAt(null), []);

  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => open(e.currentTarget),
    onMouseLeave: close,
    onFocus: (e: React.FocusEvent<HTMLElement>) => open(e.currentTarget),
    onBlur: close,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") close();
    },
    "aria-describedby": openAt ? cardId : undefined,
  };

  const card = openAt ? (
    <NodePreviewCard preview={preview} id={cardId} style={{ top: openAt.top, left: openAt.left }} />
  ) : null;

  return { handlers, card, isOpen: openAt !== null };
}

export function NodeLink({
  nodeId,
  children,
  className,
  title,
  verification,
  "aria-current": ariaCurrent,
}: {
  nodeId: string;
  children: ReactNode;
  className?: string;
  title?: string;
  /** rendered as a leading state dot when given (outline / wiki-link rows) */
  verification?: string;
  /** the sidebar marks the open page; without this the row says "current" in colour only */
  "aria-current"?: "page";
}) {
  const { handlers, card } = useNodePreview(nodeId);
  return (
    <>
      <Link
        href={`/tree/node/${nodeId}`}
        className={className}
        title={title}
        aria-current={ariaCurrent}
        {...handlers}
      >
        {verification ? (
          <>
            {/* The dot is decoration; the word beside it is the fact. aria-label
                on a bare <span> has no role to hang off and is not reliably
                announced, so the state is spelled out in .sr-only text. */}
            <span className={`node-state ${verification}`} aria-hidden="true">
              ●
            </span>
            <span className="sr-only">{verificationStateLabel(verification)} — </span>
          </>
        ) : null}
        {children}
      </Link>
      {card}
    </>
  );
}
