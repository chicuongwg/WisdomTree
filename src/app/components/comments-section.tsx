"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { T, when } from "@/lib/vi";
import { foldName } from "@/lib/mention-fold";

// The ONE comment block (docs/system/notifications.md § Comments): anchored
// discussion reused verbatim on Node Detail, Stored Item Detail and Deadline
// Detail. Threading is one reply level in the UI (parentCommentId).
//
// Mentions are typed INTO the text as "@Tên" and resolved on the server
// against the members who can see the anchor (owner decision 2026-07-20 — the
// checkbox roster is gone). The client still sends the body and nothing else,
// and the notification matrix row "comment mentioning a member" is unchanged:
// the list of names offered while typing is an aid to spelling the name, not a
// second channel for choosing recipients. The roster stays gone.
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
  members = [],
}: {
  anchorType: "source" | "tree_node" | "deadline";
  anchorId: string;
  /** Exactly the people the server will resolve a mention against. */
  members?: Array<{ id: string; displayName: string }>;
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // --- Suggesting a name while it is typed ---------------------------------
  // Typing "@" then a name and hoping is not a design a reader can use: the
  // only feedback arrives after the comment is posted, and a name that misses
  // notifies nobody without saying so. The list makes the miss impossible.
  // `at` is where the "@" sits, `text` is what has been typed after it, and
  // `end` is the cursor. Null means no suggestion is open. All three travel
  // together: deriving the query from the body alone would read past the
  // cursor and match on text the reader has not reached yet.
  const [mention, setMention] = useState<{ at: number; end: number; text: string } | null>(null);
  const [pick, setPick] = useState(0);

  /** The "@word" being typed immediately before the cursor, if any. */
  const readMention = useCallback((el: HTMLTextAreaElement) => {
    const end = el.selectionStart;
    // A mention starts the line or follows a space — never mid-word, so an
    // email address does not open the list. A name may contain spaces, so the
    // run is allowed to, and is bounded instead.
    const m = /(?:^|\s)@([^\n@]{0,40})$/.exec(el.value.slice(0, end));
    if (!m) return null;
    return { at: end - m[1].length - 1, end, text: m[1] };
  }, []);

  const matches = useMemo(() => {
    if (!mention) return [];
    const q = foldName(mention.text);
    return members.filter((m) => foldName(m.displayName).startsWith(q)).slice(0, 6);
  }, [mention, members]);

  /** Replace the half-typed "@..." with the member's real name. */
  const choose = useCallback(
    (name: string) => {
      const el = bodyRef.current;
      if (el === null || mention === null) return;
      const before = body.slice(0, mention.at);
      const after = body.slice(mention.end);
      setBody(`${before}@${name} ${after}`);
      setMention(null);
      // Leave the cursor after the name, not at the end of the box.
      const caret = before.length + name.length + 2;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [body, mention],
  );
  // The comment a notification link asked for, read once on mount.
  const [targetId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : /^#comment-(.+)$/.exec(window.location.hash)?.[1] ?? null,
  );

  // A thread that failed to load is not an empty thread. Setting [] on failure
  // told the reader "chưa có thảo luận nào" about a discussion that may be full
  // of it, so the two answers are kept apart and the failed one offers a retry.
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/comments?anchorType=${anchorType}&anchorId=${anchorId}`);
      if (!res.ok) throw new Error("load");
      setComments((await res.json()) as CommentRow[]);
    } catch {
      setComments([]);
      setLoadFailed(true);
    }
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
    let res: Response;
    try {
      res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorType,
          anchorId,
          body: body.trim(),
          ...(replyTo ? { parentCommentId: replyTo.id } : {}),
        }),
      });
    } catch {
      // Offline: without this the rejection escaped and the button below stayed
      // disabled on a comment the reader had already typed.
      setError(T.genericError);
      setBusy(false);
      return;
    }
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
   *
   * Comparison goes through the same foldName() the server's matchMentions()
   * uses, so the two sides cannot disagree about what counts as a match. They
   * did: the server matched case-insensitively while this looked for the
   * canonical spelling only, so "@phạm thu hương" resolved, notified, and then
   * rendered as plain text — and since the highlight is the ONLY sign a mention
   * was understood, a mention that worked perfectly read as one that failed.
   *
   * The token prints the member's real display name rather than the letters
   * that were typed, so the reader sees who was actually pulled in.
   */
  function renderBody(c: CommentRow) {
    const names = [...c.mentionNames].sort((a, b) => b.length - a.length);
    if (names.length === 0) return c.body;
    const parts: Array<string | { name: string }> = [c.body];
    for (const name of names) {
      const needle = foldName(`@${name}`);
      for (let i = 0; i < parts.length; i++) {
        const piece = parts[i];
        if (typeof piece !== "string") continue;
        const at = foldName(piece).indexOf(needle);
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
        ) : loadFailed ? (
          <p className="error-text">
            {T.commentsLoadFailed}{" "}
            <button type="button" className="secondary" onClick={() => void load()}>
              {T.retry}
            </button>
          </p>
        ) : topLevel.length === 0 ? (
          <p className="muted">{T.commentsEmpty}</p>
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
            onChange={(e) => {
              setBody(e.target.value);
              setMention(readMention(e.currentTarget));
              setPick(0);
            }}
            onKeyDown={(e) => {
              if (mention === null || matches.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setPick((p) => (p + 1) % matches.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setPick((p) => (p - 1 + matches.length) % matches.length);
              } else if (e.key === "Enter" || e.key === "Tab") {
                // Enter picks the name rather than submitting: the reader is
                // mid-word, and a comment sent here is one they did not finish.
                e.preventDefault();
                choose(matches[pick].displayName);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setMention(null);
              }
            }}
            onBlur={() => setMention(null)}
            rows={3}
            required
            aria-describedby={`${fieldId}-help`}
            role="combobox"
            aria-expanded={mention !== null && matches.length > 0}
            aria-controls={`${fieldId}-mentions`}
            aria-activedescendant={
              mention !== null && matches.length > 0 ? `${fieldId}-m${pick}` : undefined
            }
          />
          {mention !== null && matches.length > 0 && (
            <ul className="mention-list" id={`${fieldId}-mentions`} role="listbox">
              {matches.map((m, i) => (
                <li key={m.id} id={`${fieldId}-m${i}`} role="option" aria-selected={i === pick}>
                  <button
                    type="button"
                    className={`mention-option${i === pick ? " sel" : ""}`}
                    // onMouseDown, not onClick: the textarea's blur closes the
                    // list, and blur lands first.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(m.displayName);
                    }}
                  >
                    {m.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
