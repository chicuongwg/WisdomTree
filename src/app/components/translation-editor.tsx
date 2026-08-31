"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown, type WikiIndex } from "@/lib/markdown";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function TranslationEditor({
  nodeId,
  nodeSlug,
  translation,
  wikiIndex,
}: {
  nodeId: string;
  nodeSlug: string;
  translation: { title: string; summary: string | null; contentMd: string; version: number } | null;
  wikiIndex: WikiIndex;
}) {
  const router = useRouter();
  const mutation = useMutation();
  const [title, setTitle] = useState(translation?.title ?? "");
  const [summary, setSummary] = useState(translation?.summary ?? "");
  const [contentMd, setContentMd] = useState(translation?.contentMd ?? "");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await mutation.runJson<{ state: "saved" | "pending" }>(`/api/tree/nodes/${nodeId}/translations/en`, {
      method: "POST",
      body: { title, summary, contentMd, expectedVersion: translation?.version ?? 0 },
    });
    if (result?.state === "saved") router.push(`/wiki/${nodeId}/${nodeSlug}?lang=en`);
    if (result?.state === "pending") router.push("/review");
  }
  return (
    <form onSubmit={submit}>
      <SayMutation m={mutation} />
      <div className="field"><label htmlFor="translation-title">English title</label><input id="translation-title" value={title} onChange={(event) => setTitle(event.target.value)} required /></div>
      <div className="field"><label htmlFor="translation-summary">English summary</label><input id="translation-summary" value={summary} onChange={(event) => setSummary(event.target.value)} /></div>
      <div className="split">
        <div className="field wide"><label htmlFor="translation-content">English content</label><textarea id="translation-content" className="editor" value={contentMd} onChange={(event) => setContentMd(event.target.value)} required /></div>
        <div className="preview-pane"><Markdown content={contentMd} wikiIndex={wikiIndex} /></div>
      </div>
      <button type="submit" disabled={mutation.busy}>{mutation.busy ? "Đang lưu…" : "Lưu / gửi duyệt"}</button>
    </form>
  );
}
