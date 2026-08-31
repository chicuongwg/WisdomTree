"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Markdown } from "@/lib/markdown";
import { SayMutation } from "./say";

/** Branch Hub inline manual-node creation (Editor; enters "Chưa có nguồn dẫn"). */
export function NodeCreateForm({ branchId, team = false }: { branchId: string; team?: boolean }) {
  const router = useRouter();
  const m = useMutation();
  const [open, setOpen] = useState(false);
  const [contentMd, setContentMd] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const node = await m.runJson<{ id: string }>(team ? "/api/tree/drafts" : "/api/tree/nodes", {
      body: {
        branchId,
        title: String(form.get("title") ?? ""),
        summary: String(form.get("summary") ?? ""),
        sortOrder: Number(form.get("sortOrder") ?? 0),
        contentMd: String(form.get("contentMd") ?? ""),
      },
    });
    if (node) router.push(team ? `/tree/draft/${node.id}` : `/tree/node/${node.id}`);
  }

  if (!open) {
    return (
      <button className="secondary" onClick={() => setOpen(true)}>
        {T.addNode}
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="panel">
      <SayMutation m={m} />
      <p className="muted">
        {team
          ? "Bản nháp chỉ bạn thấy; trang chính thức được tạo khi bạn bấm Xuất bản."
          : "Trang tạo thủ công sẽ mang trạng thái “Chưa có nguồn dẫn”."}
      </p>
      <div className="field">
        <label htmlFor="new-node-title">{T.title}</label>
        <input id="new-node-title" name="title" type="text" required />
      </div>
      <div className="field">
        <label htmlFor="new-node-summary">Tóm tắt</label>
        <input id="new-node-summary" name="summary" type="text" />
      </div>
      <div className="field">
        <label htmlFor="new-node-order">Thứ tự</label>
        <input id="new-node-order" name="sortOrder" type="number" defaultValue={0} />
      </div>
      <div className="split">
        <div className="field wide">
          <label htmlFor="new-node-content">{T.contentMd}</label>
          <p className="meta">{T.contentMdHint}</p>
          <textarea
            id="new-node-content"
            name="contentMd"
            className="editor"
            value={contentMd}
            onChange={(e) => setContentMd(e.target.value)}
            required
          />
        </div>
        <div>
          <p className="muted">{T.preview}</p>
          <div className="preview-pane" aria-label={T.preview}>
            <Markdown content={contentMd} />
          </div>
        </div>
      </div>
      <button type="submit" disabled={m.busy}>
        {m.busy ? T.loading : T.save}
      </button>{" "}
      <button type="button" className="secondary" onClick={() => setOpen(false)}>
        Đóng
      </button>
    </form>
  );
}
