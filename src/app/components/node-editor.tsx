"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Markdown, type WikiIndex } from "@/lib/markdown";
import { DiffView } from "./diff-view";
import { SayMutation } from "./say";

type NodeInput = {
  id: string;
  title: string;
  contentMd: string;
  version: number;
  tags: string[];
};

// The open editor re-POSTs the lock on this cadence; the server frees a lock
// whose heartbeat is older than EDIT_LOCK_TTL_MS (default 90s).
const LOCK_HEARTBEAT_MS = 30_000;

/**
 * Edit Node editor, both tiers of the edit model:
 *   mode="live"    — your own personal node: PATCH saves immediately with
 *                    optimistic locking. Opening the editor takes the node's
 *                    single-writer lock: anyone else (any other login
 *                    session, the same person included) sees 🔒 with the
 *                    holder's name and cannot save until the lock frees.
 *                    A concurrent save still surfaces the 409 plus a diff of
 *                    your unsaved text against the latest.
 *   mode="propose" — a promoted node: the same form, but submit files a
 *                    change proposal for an independent reviewer (proposals
 *                    are queued, not raced, so no lock).
 */
export function NodeEditor({
  node,
  wikiIndex = {},
  mode = "live",
}: {
  node: NodeInput;
  wikiIndex?: WikiIndex;
  mode?: "live" | "propose";
}) {
  const router = useRouter();
  const m = useMutation();
  const [conflict, setConflict] = useState(false);
  const [latestContent, setLatestContent] = useState<string | null>(null);
  const [title, setTitle] = useState(node.title);
  const [contentMd, setContentMd] = useState(node.contentMd);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  /** Someone else holds the edit lock: their name, or null when we hold it. */
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockTick, setLockTick] = useState(0); // "Thử lại" re-runs the acquire effect

  useEffect(() => {
    if (mode !== "live") return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function acquire() {
      try {
        const res = await fetch(`/api/tree/nodes/${node.id}/lock`, { method: "POST" });
        if (stopped) return;
        if (res.ok) {
          setLockedBy(null);
        } else if (res.status === 409) {
          const body = (await res.json().catch(() => null)) as {
            details?: { holderName?: string };
          } | null;
          setLockedBy(body?.details?.holderName ?? "người khác");
        }
      } catch {
        // Network blip: keep the current state; the next heartbeat retries.
      }
    }

    void acquire();
    timer = setInterval(() => void acquire(), LOCK_HEARTBEAT_MS);
    const release = () => {
      // keepalive so the DELETE survives the page going away.
      void fetch(`/api/tree/nodes/${node.id}/lock`, { method: "DELETE", keepalive: true });
    };
    window.addEventListener("pagehide", release);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [mode, node.id, lockTick]);

  const locked = mode === "live" && lockedBy !== null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) return;
    setConflict(false);
    setLatestContent(null);
    const body = {
      title,
      contentMd,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      expectedVersion: node.version,
    };
    const saved = await m.run(
      mode === "live" ? `/api/tree/nodes/${node.id}` : `/api/tree/nodes/${node.id}/proposals`,
      {
        method: mode === "live" ? "PATCH" : "POST",
        body,
        ...(mode === "propose" ? { ok: T.proposalSentOk } : {}),
        onError: (res, resBody) => {
          const isConflict = res.status === 409 && resBody?.code === "version_conflict";
          setConflict(isConflict);
          if (isConflict) {
            // Show what actually changed underneath the writer before they
            // decide between reloading and re-applying their paragraph.
            void fetch(`/api/tree/nodes/${node.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((latest: { contentMd?: string } | null) => {
                if (latest?.contentMd !== undefined) setLatestContent(latest.contentMd);
              })
              .catch(() => {});
          }
        },
      },
    );
    if (saved && mode === "live") router.push(`/tree/node/${node.id}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <SayMutation m={m} />
      {locked && (
        <p className="notice" role="alert">
          {T.editLockBanner(lockedBy ?? "")}{" "}
          <button type="button" className="secondary" onClick={() => setLockTick((n) => n + 1)}>
            {T.retry}
          </button>
        </p>
      )}
      {conflict && (
        <button type="button" className="secondary" onClick={() => router.refresh()}>
          {T.reloadNewVersion}
        </button>
      )}
      {conflict && latestContent !== null && (
        <section aria-label={T.compareWithLatestAria}>
          <p className="muted">{T.latestVsYours}</p>
          <DiffView before={latestContent} after={contentMd} />
        </section>
      )}
      <div className="field">
        <label htmlFor="node-title">{T.title}</label>
        <input
          id="node-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={locked}
          required
        />
      </div>
      <div className="split">
        <div className="field wide">
          <label htmlFor="node-content">{T.contentMd}</label>
          <p className="meta">{T.contentMdHint}</p>
          <textarea
            id="node-content"
            className="editor"
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            disabled={locked}
            required
          />
        </div>
        <div>
          <p className="muted">{T.preview}</p>
          <div className="preview-pane" aria-label={T.preview}>
            <Markdown content={contentMd} wikiIndex={wikiIndex} />
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="node-tags">{T.tags} (phân cách bằng dấu phẩy)</label>
        <input
          id="node-tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          disabled={locked}
        />
      </div>
      {mode === "propose" && (
        <p className="muted">{T.proposeModeNote}</p>
      )}
      {/* The answer sits with the button, not only at the top of a form whose
          middle is a full-height editor. The one above stays: a version
          conflict is read on the way back UP to the reload button. */}
      <SayMutation m={m} />
      <p>
        <button type="submit" disabled={m.busy || locked}>
          {m.busy ? T.loading : mode === "live" ? T.save : T.sendProposal}
        </button>
      </p>
    </form>
  );
}
