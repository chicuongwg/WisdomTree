"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, translateApiError } from "@/lib/vi";
import { Say } from "./say";
import { PREVIEW_HOVER_DELAY_MS } from "./node-link";

export function CatalogCover({
  sourceId,
  title,
  coverPhotoKey,
  compact = false,
}: {
  sourceId: string;
  title: string;
  coverPhotoKey: string | null;
  compact?: boolean;
}) {
  const className = `catalog-cover${compact ? " compact" : ""}`;
  if (!coverPhotoKey) {
    return (
      <span className={`${className} placeholder`} aria-label={T.coverPlaceholder}>
        <span aria-hidden="true">▤</span>
        {!compact && <span>{T.coverPlaceholder}</span>}
      </span>
    );
  }
  return (
    /* Session-guarded object-store route; the DB key provides cache busting. */
    <img
      className={className}
      src={`/api/library/${sourceId}/cover?v=${encodeURIComponent(coverPhotoKey)}`}
      alt={`${T.coverPhoto}: ${title}`}
    />
  );
}

export function CatalogCoverForm({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const body = new FormData();
    body.append("file", file);
    let response: Response;
    try {
      response = await fetch(`/api/library/${sourceId}/cover`, { method: "POST", body });
    } catch {
      setError(T.genericError);
      setBusy(false);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
          message?: string;
          code?: string;
          details?: Record<string, unknown>;
        } | null;
      setError(payload ? translateApiError(payload.code, payload.details, payload.message) : T.genericError);
      setBusy(false);
      return;
    }
    setFile(null);
    setSaved(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="catalog-cover-form">
      <div className="file-field">
        <input
          id={`catalog-cover-${sourceId}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <label htmlFor={`catalog-cover-${sourceId}`} className="button secondary">
          {T.chooseCover}
        </label>
        <span className="muted">{file ? file.name : T.coverConstraint}</span>
      </div>
      <Say error={error} ok={saved ? T.coverSaved : undefined} />
      <button type="button" disabled={busy || !file} onClick={() => void upload()}>
        {busy ? T.loading : T.save}
      </button>
    </div>
  );
}

function coverPosition(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const width = 160;
  const height = 240;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 8;
  const top = below + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : below;
  return { top, left };
}

export function CatalogItemLink({
  sourceId,
  title,
  coverPhotoKey,
}: {
  sourceId: string;
  title: string;
  coverPhotoKey: string | null;
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardId = useId();

  const close = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setPosition(null);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!position) return;
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [position, close]);

  return (
    <>
      <Link
        href={`/catalog/${sourceId}`}
        aria-describedby={position ? cardId : undefined}
        onMouseEnter={(event) => {
          const target = event.currentTarget;
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(
            () => setPosition(coverPosition(target)),
            PREVIEW_HOVER_DELAY_MS,
          );
        }}
        onMouseLeave={close}
        onFocus={(event) => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          setPosition(coverPosition(event.currentTarget));
        }}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        {title}
      </Link>
      {position && (
        <span
          className="catalog-cover-card"
          id={cardId}
          role="tooltip"
          style={{ top: position.top, left: position.left }}
        >
          <CatalogCover sourceId={sourceId} title={title} coverPhotoKey={coverPhotoKey} />
        </span>
      )}
    </>
  );
}
