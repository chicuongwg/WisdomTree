"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { foldName } from "@/lib/mention-fold";
import { Button } from "./primitives/button";
import { formatUiDate, translate } from "./localization";

type CommentRow = {
  id: string;
  parentCommentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  mentions: string[];
  mentionNames: string[];
  createdAt: Date | string;
};

type Member = { id: string; displayName: string };
type PresencePerson = { userId: string; displayName: string };

const PRESENCE_BEAT_MS = 45_000;

function initials(name: string) {
  return (name.split(/\s+/).filter(Boolean).at(-1) ?? "?").slice(0, 2).toUpperCase();
}

function renderBody(comment: CommentRow) {
  if (!comment.mentionNames.length) return comment.body;
  const names = [...comment.mentionNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `@(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "giu",
  );
  const parts = comment.body.split(pattern);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={`${part}-${index}`}
        className="ui-next-comment__mention rounded px-1 bg-ui-success-bg text-ui-text font-semibold"
      >
        @{part}
      </mark>
    ) : (
      part
    ),
  );
}

function Presence({ locale, url }: { locale: UiLocale; url: string }) {
  const [people, setPeople] = useState<PresencePerson[]>([]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const leave = () => {
      void fetch(url, { method: "DELETE", keepalive: true });
    };
    const beat = async () => {
      try {
        const response = await fetch(url, { method: "POST", cache: "no-store" });
        if (!stopped && response.ok) setPeople((await response.json()) as PresencePerson[]);
      } catch {
        // Presence is advisory. A failed heartbeat does not interrupt work.
      }
    };
    const sync = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === "visible") {
        void beat();
        timer = setInterval(beat, PRESENCE_BEAT_MS);
      } else {
        leave();
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [url]);

  if (!people.length) return null;
  return (
    <p
      className="ui-next-presence flex items-center gap-2 flex-wrap mt-2 text-ui-text-muted text-sm"
      aria-live="polite"
    >
      <span>{translate(locale, "collaboration.viewing")}</span>
      {people.map((person) => (
        <span
          key={person.userId}
          className="ui-next-presence__person inline-flex items-center gap-1"
        >
          <span
            className="ui-next-presence__initials size-[1.35rem] inline-grid place-items-center rounded-full bg-ui-neutral-bg text-ui-text text-[0.63rem] font-bold"
            aria-hidden="true"
          >
            {initials(person.displayName)}
          </span>
          {person.displayName}
        </span>
      ))}
    </p>
  );
}

export function CollaborationSection({
  locale,
  commentsUrl,
  presenceUrl,
  members,
}: {
  locale: UiLocale;
  commentsUrl: string;
  presenceUrl: string;
  members: Member[];
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [mention, setMention] = useState<{ at: number; end: number; text: string } | null>(null);
  const [selectedMention, setSelectedMention] = useState(0);
  const fieldId = useId();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const response = await fetch(commentsUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("comment_load_failed");
      setComments((await response.json()) as CommentRow[]);
    } catch {
      setComments([]);
      setLoadFailed(true);
    }
  }, [commentsUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTargetId(/^#comment-(.+)$/.exec(window.location.hash)?.[1] ?? null);
  }, []);

  useEffect(() => {
    if (!targetId || comments === null) return;
    const target = document.getElementById(`comment-${targetId}`);
    if (!target) return;
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    target.focus({ preventScroll: true });
  }, [comments, targetId]);

  const readMention = useCallback((element: HTMLTextAreaElement) => {
    const end = element.selectionStart;
    const found = /(?:^|\s)@([^\n@]{0,40})$/.exec(element.value.slice(0, end));
    return found ? { at: end - found[1].length - 1, end, text: found[1] } : null;
  }, []);

  const matches = useMemo(() => {
    if (!mention) return [];
    const query = foldName(mention.text);
    return members.filter((member) => foldName(member.displayName).startsWith(query)).slice(0, 6);
  }, [members, mention]);

  const chooseMention = useCallback(
    (name: string) => {
      const element = bodyRef.current;
      if (!element || !mention) return;
      const before = body.slice(0, mention.at);
      const after = body.slice(mention.end);
      setBody(`${before}@${name} ${after}`);
      setMention(null);
      const caret = before.length + name.length + 2;
      requestAnimationFrame(() => {
        element.focus();
        element.setSelectionRange(caret, caret);
      });
    },
    [body, mention],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(commentsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          ...(replyTo ? { parentCommentId: replyTo.id } : {}),
        }),
      });
      if (!response.ok) throw new Error("comment_post_failed");
      setBody("");
      setReplyTo(null);
      setMessage(translate(locale, "collaboration.posted"));
      await load();
    } catch {
      setMessage(translate(locale, "collaboration.postFailed"));
    } finally {
      setBusy(false);
    }
  }

  const topLevel = (comments ?? []).filter((comment) => !comment.parentCommentId);
  const replies = (commentId: string) =>
    (comments ?? []).filter((comment) => comment.parentCommentId === commentId);
  const renderComment = (comment: CommentRow, nested = false) => (
    <li
      key={comment.id}
      id={`comment-${comment.id}`}
      tabIndex={-1}
      className={`ui-next-comment grid gap-2 border border-ui-border rounded-lg p-4 bg-ui-surface outline-none focus-visible:border-ui-focus focus-visible:ring-2 focus-visible:ring-ui-focus/25${
        nested ? " ui-next-comment--reply bg-ui-surface-sunken" : ""
      }${targetId === comment.id ? " ui-next-comment--target border-ui-focus ring-2 ring-ui-focus/25" : ""}`}
    >
      <div className="ui-next-comment__meta flex items-baseline gap-2 flex-wrap text-ui-text-muted text-sm">
        <strong className="text-ui-text font-bold">{comment.authorName}</strong>
        <span>
          {formatUiDate(comment.createdAt, locale, { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>
      <p className="ui-next-comment__body m-0 whitespace-pre-wrap break-words leading-relaxed">
        {renderBody(comment)}
      </p>
      {!nested ? (
        <Button
          type="button"
          variant="ghost"
          className="ui-next-comment__reply justify-self-start"
          onClick={() => {
            setReplyTo(comment);
            bodyRef.current?.focus();
          }}
        >
          {translate(locale, "collaboration.reply")}
        </Button>
      ) : null}
      {replies(comment.id).length ? (
        <ul className="ui-next-comment-list ui-next-comment-list--replies ml-4 grid gap-3 list-none p-0">
          {replies(comment.id).map((reply) => renderComment(reply, true))}
        </ul>
      ) : null}
    </li>
  );

  return (
    <section
      className="ui-next-collaboration grid gap-4 max-w-[var(--ui-width-reading)] w-full mx-auto border-t border-ui-border pt-6"
      aria-labelledby={`${fieldId}-title`}
    >
      <header className="ui-next-collaboration__header">
        <div>
          <h2 id={`${fieldId}-title`} className="m-0 text-lg font-bold">
            {translate(locale, "collaboration.title")}
          </h2>
          <Presence locale={locale} url={presenceUrl} />
        </div>
      </header>

      <div role="status" aria-live="polite" className="ui-next-collaboration__status">
        {comments === null ? (
          <p className="m-0 text-sm text-ui-text-secondary">
            {translate(locale, "common.loading")}
          </p>
        ) : null}
        {loadFailed ? (
          <p className="m-0 text-sm text-ui-text-secondary">
            {translate(locale, "collaboration.loadFailed")}{" "}
            <Button type="button" variant="ghost" onClick={() => void load()}>
              {translate(locale, "common.tryAgain")}
            </Button>
          </p>
        ) : null}
        {!loadFailed && comments !== null && !topLevel.length ? (
          <p className="m-0 text-sm text-ui-text-secondary">
            {translate(locale, "collaboration.empty")}
          </p>
        ) : null}
      </div>
      {topLevel.length ? (
        <ul className="ui-next-comment-list grid gap-3 m-0 p-0 list-none">
          {topLevel.map((comment) => renderComment(comment))}
        </ul>
      ) : null}

      <form
        className="ui-next-comment-composer grid gap-3 p-4 border border-ui-border rounded-lg bg-ui-surface-sunken"
        onSubmit={submit}
      >
        {replyTo ? (
          <p className="ui-next-comment-composer__replying m-0 text-sm text-ui-text-secondary">
            {translate(locale, "collaboration.replyingTo", { name: replyTo.authorName })}{" "}
            <Button type="button" variant="ghost" onClick={() => setReplyTo(null)}>
              {translate(locale, "common.cancel")}
            </Button>
          </p>
        ) : null}
        <label htmlFor={`${fieldId}-body`} className="text-ui-text text-sm font-bold">
          {translate(locale, "collaboration.write")}
        </label>
        <textarea
          id={`${fieldId}-body`}
          ref={bodyRef}
          value={body}
          className="w-full min-h-[6rem] resize-y border border-ui-border-strong rounded p-3 bg-ui-surface text-ui-text text-base leading-normal focus-visible:outline-2 focus-visible:outline-ui-focus focus-visible:outline-offset-2"
          onChange={(event) => {
            setBody(event.target.value);
            setMention(readMention(event.currentTarget));
            setSelectedMention(0);
          }}
          onKeyDown={(event) => {
            if (!mention || !matches.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelectedMention((index) => (index + 1) % matches.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelectedMention((index) => (index - 1 + matches.length) % matches.length);
            } else if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              chooseMention(matches[selectedMention].displayName);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setMention(null);
            }
          }}
          onBlur={() => setMention(null)}
          rows={4}
          required
          aria-describedby={`${fieldId}-help`}
          aria-controls={`${fieldId}-mentions`}
          aria-activedescendant={
            mention && matches.length ? `${fieldId}-mention-${selectedMention}` : undefined
          }
        />
        {mention && matches.length ? (
          <ul
            id={`${fieldId}-mentions`}
            className="ui-next-mention-list grid max-w-[28rem] -mt-2 p-1 list-none border border-ui-border-strong rounded bg-ui-surface-raised shadow-lg"
            role="listbox"
          >
            {matches.map((member, index) => (
              <li
                key={member.id}
                id={`${fieldId}-mention-${index}`}
                role="option"
                aria-selected={selectedMention === index}
                className={`rounded px-3 py-2 cursor-pointer border-b border-ui-border last:border-b-0 hover:bg-ui-surface-sunken ${
                  selectedMention === index
                    ? "is-selected bg-ui-success-bg text-ui-text font-semibold"
                    : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  chooseMention(member.displayName);
                }}
              >
                {member.displayName}
              </li>
            ))}
          </ul>
        ) : null}
        <p
          id={`${fieldId}-help`}
          className="ui-next-comment-composer__help m-0 text-sm text-ui-text-secondary"
        >
          {translate(locale, "collaboration.mentionHelp")}
        </p>
        {message ? (
          <p role="status" aria-live="polite" className="m-0 text-sm text-ui-text">
            {message}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          loadingLabel={translate(locale, "common.loading")}
          disabled={!body.trim()}
        >
          {translate(locale, "collaboration.submit")}
        </Button>
      </form>
    </section>
  );
}
