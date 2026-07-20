"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { T, when } from "@/lib/vi";

// The ONE comment block (docs/system/notifications.md § Comments): anchored
// discussion reused verbatim on Node Detail, Stored Item Detail and Deadline
// Detail. Threading is one reply level in the UI (parentCommentId).
//
// Mentions are typed INTO the text as "@Tên" and resolved on the server
// against the members who can see the anchor (owner decision 2026-07-20 — the
// checkbox roster is gone). The client sends the body and nothing else; the
// notification matrix row "comment mentioning a member" is unchanged.
//
// A loan ticket is not an anchor: a loan carries a factual record on the
// Catalog Item Detail screen instead.

type CommentRow = {
  id: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  mentions: string[];
  /** Display names of the resolved mentions, for highlighting the body. */
  mentionNames: string[];
  createdAt: string;
};

export function CommentsSection({
  anchorType,
  anchorId,
}: {
  anchorType: "source" | "tree_node" | "deadline";
  anchorId: string;
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // The comment a notification link asked for, read once on mount.
  const [targetId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : /^#comment-(.+)$/.exec(window.location.hash)?.[1] ?? null,
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/comments?anchorType=${anchorType}&anchorId=${anchorId}`);
    if (res.ok) setComments((await res.json()) as CommentRow[]);
    else setComments([]);
  }, [anchorType, anchorId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Comments arrive after hydration, so the browser has already given up on
  // the #comment-<id> fragment by the time the target exists. Once the list
  // is in the DOM, take the reader there ourselves — and move focus, so a
  // keyboard reader lands on the comment too, not just the viewport.
  useEffect(() => {
    if (!targetId || comments === null) return;
    const el = document.getElementById(`comment-${targetId}`);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [targetId, comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anchorType,
        anchorId,
        body: body.trim(),
        ...(replyTo ? { parentCommentId: replyTo.id } : {}),
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    setBody("");
    setReplyTo(null);
    setBusy(false);
    await load();
  }

  const topLevel = (comments ?? []).filter((c) => !c.parentCommentId);
  const repliesOf = (id: string) => (comments ?? []).filter((c) => c.parentCommentId === id);

  /**
   * Highlight the @Tên tokens the server actually resolved. A token is a mark,
   * not a link: a member's name has nowhere to go, and a fake link teaches the
   * reader to distrust the real ones. Longest name first so "@Lan Anh" wins
   * over "@Lan".
   */
  function renderBody(c: CommentRow) {
    const names = [...c.mentionNames].sort((a, b) => b.length - a.length);
    if (names.length === 0) return c.body;
    const parts: Array<string | { name: string }> = [c.body];
    for (const name of names) {
      const needle = `@${name}`;
      for (let i = 0; i < parts.length; i++) {
        const piece = parts[i];
        if (typeof piece !== "string") continue;
        const at = piece.indexOf(needle);
        if (at < 0) continue;
        parts.splice(
          i,
          1,
          piece.slice(0, at),
          { name },
          piece.slice(at + needle.length),
        );
        i += 2;
      }
    }
    return parts.map((piece, i) =>
      typeof piece === "string" ? (
        piece
      ) : (
        <mark key={i} className="mention-token">
          @{piece.name}
        </mark>
      ),
    );
  }

  const renderComment = (c: CommentRow, isReply: boolean) => (
    // id="comment-<id>" is the jump target a comment.created notification
    // links to (modules/notify/links.ts appends the fragment). tabIndex -1
    // lets the browser move focus here too, not just the scroll position.
    <li
      key={c.id}
      id={`comment-${c.id}`}
      tabIndex={-1}
      className={`comment${isReply ? " comment-reply" : ""}${
        c.id === targetId ? " comment-targeted" : ""
      }`}
    >
      <div className="comment-meta">
        <strong>{c.authorName}</strong>
        <span className="muted"> · {when(c.createdAt)}</span>
      </div>
      <p className="comment-body">{renderBody(c)}</p>
      {!isReply && (
        // "Trả lời" used to set the target and leave the reader where they
        // stood — with the box it aimed at sitting past the whole thread, so a
        // keyboard reader had to tab through every comment to reach it.
        <button
          type="button"
          className="secondary comment-reply-btn"
          onClick={() => {
            setReplyTo(c);
            bodyRef.current?.focus();
          }}
        >
          {T.reply}
        </button>
      )}
      {repliesOf(c.id).length > 0 && (
        <ul className="comment-list">{repliesOf(c.id).map((r) => renderComment(r, true))}</ul>
      )}
    </li>
  );

  return (
    <section className="panel" aria-label={T.comments}>
      <h2>{T.comments}</h2>
      {/* The thread arrives after hydration, so "Đang tải…" and the answer that
          replaces it are both changes a screen reader has to be told about.
          The region is in the DOM from the first render for that to work; the
          list itself stays outside it, or loading a thread would read the whole
          thread aloud. */}
      <div role="status" aria-live="polite">
        {comments === null ? (
          <p className="muted">{T.loading}</p>
        ) : topLevel.length === 0 ? (
          <p className="muted">Chưa có thảo luận nào. Hãy là người mở đầu.</p>
        ) : null}
      </div>
      {topLevel.length > 0 && (
        <ul className="comment-list">{topLevel.map((c) => renderComment(c, false))}</ul>
      )}

      <form onSubmit={submit}>
        {replyTo && (
          <p className="muted">
            {T.reply}: {replyTo.authorName}{" "}
            <button type="button" className="secondary" onClick={() => setReplyTo(null)}>
              {T.cancel}
            </button>
          </p>
        )}
        <div className="field wide">
          {/* The panel heading already says "Thảo luận"; repeating it on the box
              named the room, not the thing being written in it. */}
          <label htmlFor={`${fieldId}-body`}>
            {replyTo ? `${T.reply} ${replyTo.authorName}` : T.newComment}
          </label>
          <textarea
            id={`${fieldId}-body`}
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
            aria-describedby={`${fieldId}-help`}
          />
          <p id={`${fieldId}-help`} className="field-help">
            {T.mentionHelp}
          </p>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={busy || !body.trim()}>
          {busy ? T.loading : T.addComment}
        </button>
      </form>
    </section>
  );
}
