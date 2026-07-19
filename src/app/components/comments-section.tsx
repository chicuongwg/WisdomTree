"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { T } from "@/lib/vi";

// The ONE comment block (docs/system/notifications.md § Comments): anchored
// discussion reused verbatim on Node Detail, Stored Item Detail, Catalog Item
// Detail (loan context) and Deadline Detail. Threading is one reply level in
// the UI (parentCommentId), mentions are checkbox picks that trigger
// notifications through the matrix.

type CommentRow = {
  id: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  mentions: string[];
  createdAt: string;
};

export type MentionOption = { id: string; displayName: string };

export function CommentsSection({
  anchorType,
  anchorId,
  mentionOptions,
}: {
  anchorType: "source" | "tree_node" | "loan_ticket" | "deadline";
  anchorId: string;
  mentionOptions: MentionOption[];
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  const load = useCallback(async () => {
    const res = await fetch(`/api/comments?anchorType=${anchorType}&anchorId=${anchorId}`);
    if (res.ok) setComments((await res.json()) as CommentRow[]);
    else setComments([]);
  }, [anchorType, anchorId]);

  useEffect(() => {
    void load();
  }, [load]);

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
        mentions,
        ...(replyTo ? { parentCommentId: replyTo.id } : {}),
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    setBody("");
    setMentions([]);
    setReplyTo(null);
    setBusy(false);
    await load();
  }

  const nameOf = (id: string) => mentionOptions.find((m) => m.id === id)?.displayName ?? "";
  const topLevel = (comments ?? []).filter((c) => !c.parentCommentId);
  const repliesOf = (id: string) => (comments ?? []).filter((c) => c.parentCommentId === id);

  const renderComment = (c: CommentRow, isReply: boolean) => (
    <li key={c.id} className={`comment${isReply ? " comment-reply" : ""}`}>
      <div className="comment-meta">
        <strong>{c.authorName}</strong>
        <span className="muted"> · {new Date(c.createdAt).toLocaleString("vi-VN")}</span>
        {c.mentions.length > 0 && (
          <span className="muted">
            {" · "}
            {T.mentionMembers.toLowerCase()}: {c.mentions.map(nameOf).filter(Boolean).join(", ")}
          </span>
        )}
      </div>
      <p className="comment-body">{c.body}</p>
      {!isReply && (
        <button type="button" className="secondary comment-reply-btn" onClick={() => setReplyTo(c)}>
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
      <h2 style={{ marginTop: 0 }}>{T.comments}</h2>
      {comments === null ? (
        <p className="muted">{T.loading}</p>
      ) : topLevel.length === 0 ? (
        <p className="muted">Chưa có thảo luận nào. Hãy là người mở đầu.</p>
      ) : (
        <ul className="comment-list">{topLevel.map((c) => renderComment(c, false))}</ul>
      )}

      <form onSubmit={submit}>
        {replyTo && (
          <p className="muted">
            {T.reply}: {replyTo.authorName}{" "}
            <button type="button" className="secondary" onClick={() => setReplyTo(null)}>
              Hủy
            </button>
          </p>
        )}
        <div className="field" style={{ maxWidth: "none" }}>
          <label htmlFor={`${fieldId}-body`}>{T.comments}</label>
          <textarea
            id={`${fieldId}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
          />
        </div>
        <fieldset className="mention-fieldset">
          <legend>{T.mentionMembers}</legend>
          {mentionOptions.map((m) => (
            <label key={m.id} className="checkbox-row" style={{ display: "inline-flex", marginRight: "1rem" }}>
              <input
                type="checkbox"
                checked={mentions.includes(m.id)}
                onChange={(e) =>
                  setMentions((prev) =>
                    e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                  )
                }
              />
              {m.displayName}
            </label>
          ))}
        </fieldset>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={busy || !body.trim()}>
          {busy ? T.loading : T.addComment}
        </button>
      </form>
    </section>
  );
}
