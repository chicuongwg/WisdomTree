"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Markdown, type WikiIndex } from "@/lib/markdown";
import { DiffView } from "./diff-view";
import { SayMutation } from "./say";
import type { MarkdownIssue } from "@/lib/markdown-validation";

type NodeInput = {
  id: string;
  title: string;
  summary: string | null;
  sortOrder: number;
  contentMd: string;
  version: number;
  tags: string[];
};

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
  const [summary, setSummary] = useState(node.summary ?? "");
  const [sortOrder, setSortOrder] = useState(node.sortOrder);
  const [contentMd, setContentMd] = useState(node.contentMd);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  const [validation, setValidation] = useState<MarkdownIssue[] | null>(null);

  async function validateContent() {
    const response = await fetch("/api/tree/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentMd }),
    });
    const result = response.ok ? ((await response.json()) as { issues: MarkdownIssue[] }) : null;
    setValidation(
      result?.issues ?? [
        { severity: "error", code: "validation_failed", message: "Không thể kiểm tra nội dung." },
      ],
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConflict(false);
    setLatestContent(null);
    const body = {
      title,
      summary,
      sortOrder,
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
        <input id="node-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="node-summary">Tóm tắt</label>
        <input id="node-summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="node-order">Thứ tự</label>
        <input
          id="node-order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
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
            required
          />
          <p>
            <button type="button" className="secondary" onClick={() => void validateContent()}>
              Kiểm tra nội dung
            </button>
          </p>
          {validation &&
            (validation.length ? (
              <ul className="validation-list">
                {validation.map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className={issue.severity}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="meta">Không phát hiện lỗi liên kết hoặc cú pháp.</p>
            ))}
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
        <input id="node-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </div>
      {mode === "propose" && <p className="muted">{T.proposeModeNote}</p>}
      {/* The answer sits with the button, not only at the top of a form whose
          middle is a full-height editor. The one above stays: a version
          conflict is read on the way back UP to the reload button. */}
      <SayMutation m={m} />
      <p>
        <button type="submit" disabled={m.busy}>
          {m.busy ? T.loading : mode === "live" ? T.save : T.sendProposal}
        </button>
      </p>
    </form>
  );
}
