"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, verificationStateLabel } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

type NodeInput = {
  id: string;
  title: string;
  contentMd: string;
  verification: string;
  publish: boolean;
  version: number;
  tags: string[];
};

/**
 * Edit Node editor: Markdown source with optimistic locking. The PATCH sends
 * expectedVersion captured at load; a concurrent save surfaces the contract
 * 409 message and offers a reload. The verification select (Admin/Op only)
 * exposes the state-machine transitions, incl. verified→unverified downgrade.
 */
export function NodeEditor({ node, isAdmin }: { node: NodeInput; isAdmin: boolean }) {
  const router = useRouter();
  const m = useMutation();
  const [conflict, setConflict] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [contentMd, setContentMd] = useState(node.contentMd);
  const [tagsText, setTagsText] = useState(node.tags.join(", "));
  const [verification, setVerification] = useState(node.verification);
  const [publish, setPublish] = useState(node.publish);

  const verificationOptions: Record<string, string[]> = {
    no_source: ["no_source", "unverified", "archived"],
    unverified: ["unverified", "verified", "archived"],
    verified: ["verified", "unverified", "archived"],
    archived: ["archived"],
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConflict(false);
    const saved = await m.run(`/api/tree/nodes/${node.id}`, {
      method: "PATCH",
      body: {
        title,
        contentMd,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        expectedVersion: node.version,
        ...(isAdmin ? { verification, publish } : {}),
      },
      // A colleague saved first. The offer to reload is the only way out that
      // does not throw away what is in the box, so it needs the code, not just
      // the sentence.
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
          <pre className="raw-text" aria-label={T.preview}>{contentMd}</pre>
        </div>
      </div>
      <div className="field">
        <label htmlFor="node-tags">{T.tags} (phân cách bằng dấu phẩy)</label>
        <input id="node-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </div>
      {isAdmin && (
        <>
          <div className="field">
            <label htmlFor="node-verification">{T.verificationLabelTitle}</label>
            <select
              id="node-verification"
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
            >
              {verificationOptions[node.verification].map((v) => (
                <option key={v} value={v}>
                  {verificationStateLabel(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="checkbox-row">
            <input
              id="node-publish"
              type="checkbox"
              checked={publish}
              disabled={verification !== "verified"}
              onChange={(e) => setPublish(e.target.checked)}
            />
            <label htmlFor="node-publish">
              {T.publish} công khai (chỉ áp dụng cho trang Đã thẩm định)
            </label>
          </div>
        </>
      )}
      <p>
        <button type="submit" disabled={m.busy}>
          {m.busy ? T.loading : T.save}
        </button>
      </p>
    </form>
  );
}
