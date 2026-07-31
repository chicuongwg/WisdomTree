"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Markdown, type WikiIndex } from "@/lib/markdown";
import { SayMutation } from "./say";

type NodeInput = {
  id: string;
  title: string;
  contentMd: string;
  version: number;
  tags: string[];
};

/**
 * Edit Node editor: Markdown source with optimistic locking. The PATCH sends
 * expectedVersion captured at load; a concurrent save surfaces the contract
 * 409 message and offers a reload. Verification and publication decisions
 * stay on the independent review surfaces.
 */
export function NodeEditor({
  node,
  wikiIndex = {},
}: {
  node: NodeInput;
  wikiIndex?: WikiIndex;
}) {
  const router = useRouter();
  const m = useMutation();
  const [conflict, setConflict] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [contentMd, setContentMd] = useState(node.contentMd);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConflict(false);
    const saved = await m.run(`/api/tree/nodes/${node.id}`, {
      method: "PATCH",
      body: {
        title,
        contentMd,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        expectedVersion: node.version,
      },
      onError: (res, body) => setConflict(res.status === 409 && body?.code === "version_conflict"),
    });
    if (saved) router.push(`/tree/node/${node.id}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <SayMutation m={m} />
      {conflict && (
        <button type="button" className="secondary" onClick={() => router.refresh()}>
          {T.reloadNewVersion}
        </button>
      )}
      <div className="field">
        <label htmlFor="node-title">{T.title}</label>
        <input id="node-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
      {/* The answer sits with the button, not only at the top of a form whose
          middle is a full-height editor. The one above stays: a version
          conflict is read on the way back UP to the reload button. */}
      <SayMutation m={m} />
      <p>
        <button type="submit" disabled={m.busy}>
          {m.busy ? T.loading : T.save}
        </button>
      </p>
    </form>
  );
}
