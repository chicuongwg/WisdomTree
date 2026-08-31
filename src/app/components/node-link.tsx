"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { T, verificationStateLabel } from "@/lib/vi";
import { wikiPath } from "@/lib/wiki-path";

// The one node link in the app. Every place a page is named — sidebar
// outline, graph, backlinks, outgoing links, wiki-links inside content,
// command-palette results — goes through this component, so hovering or
// tabbing to a page name always shows the same card: title, verification,
// ~200 characters of content.
//
// Accessibility: pointer hover waits for intent before opening; keyboard focus
// opens immediately, so the information is never hover-only. The card closes
// on blur/leave/Escape, is described by aria-describedby, and never animates
// when the reader asks for reduced motion (the CSS honours
// prefers-reduced-motion).

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
export const PREVIEW_HOVER_DELAY_MS = 1000;

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

/** The width the card is actually given, read from the token that gives it:
 * mirroring `--node-card-w` by hand mispositions every card the day it moves.
 * ponytail: rem is the only unit that token has ever held; anything else falls
 * through as a raw number, and an unreadable value falls back to 18rem @ 16px. */
/** A length token in pixels, so the geometry here and the CSS cannot disagree. */
function cssPx(token: string, fallback: number): number {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(token).trim();
  const n = parseFloat(raw);
  const px = raw.endsWith("rem") ? n * parseFloat(getComputedStyle(root).fontSize) : n;
  return px > 0 ? px : fallback;
}

/** Where the card goes for a given trigger: below it, flipped up near the
 * bottom edge, always inside the viewport. Shared by the hook and the map. */
export function cardPosition(target: Element): { top: number; left: number } {
  const rect = target.getBoundingClientRect();
  const width = cssPx("--node-card-w", 288);
  // The card's height is CAPPED in CSS at this token, so reading it here is a
  // measurement rather than the guess it used to be. A hardcoded 160 was right
  // until a long Vietnamese title wrapped: the card grew past it, the flip
  // decision was made on the wrong number, and the overflow hung below the
  // viewport where nothing could reach it — the card is pointer-events: none,
  // so it cannot even be scrolled.
  const height = cssPx("--node-card-h", 160);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 8;
  const top = below + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : below;
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
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
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
  const close = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setOpenAt(null);
  }, []);

  /**
   * The card is `position: fixed` and placed once, from the trigger's box at
   * the moment it opened. Scroll the page — a trackpad nudge, or a keyboard
   * reader moving down the sidebar — and the card stayed pinned to the viewport
   * while the row it describes slid away, until it was floating over unrelated
   * text with no relationship to anything.
   *
   * Closing is the right answer rather than repositioning: the card is a peek
   * at something under the pointer, and once the pointer has left, there is
   * nothing to peek at. Capture phase, because the scroller is .main-area
   * rather than the window.
   */
  useEffect(() => {
    if (!openAt) return;
    const onScroll = () => setOpenAt(null);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [openAt]);

  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const target = e.currentTarget;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => open(target), PREVIEW_HOVER_DELAY_MS);
    },
    onMouseLeave: close,
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      open(e.currentTarget);
    },
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
  slug,
  "aria-current": ariaCurrent,
}: {
  nodeId: string;
  children: ReactNode;
  className?: string;
  title?: string;
  /** rendered as a leading state dot when given (outline / wiki-link rows) */
  verification?: string;
  slug?: string;
  /** the sidebar marks the open page; without this the row says "current" in colour only */
  "aria-current"?: "page";
}) {
  const { handlers, card } = useNodePreview(nodeId);
  return (
    <>
      <Link
        href={wikiPath(nodeId, slug)}
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
