"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { Say } from "./say";

/** Branch Hub inline manual-node creation (Editor; enters "Chưa có nguồn dẫn"). */
export function NodeCreateForm({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/tree/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        title: String(form.get("title") ?? ""),
        contentMd: String(form.get("contentMd") ?? ""),
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    const node = (await res.json()) as { id: string };
    router.push(`/tree/node/${node.id}`);
    router.refresh();
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
      <Say error={error} />
      <p className="muted">Trang tạo thủ công sẽ mang trạng thái “Chưa có nguồn dẫn”.</p>
      <div className="field">
        <label htmlFor="new-node-title">{T.title}</label>
        <input id="new-node-title" name="title" type="text" required />
      </div>
      <div className="field wide">
        <label htmlFor="new-node-content">{T.contentMd}</label>
        <textarea id="new-node-content" name="contentMd" className="editor" required />
      </div>
      <button type="submit" disabled={busy}>
        {busy ? T.loading : T.save}
      </button>{" "}
      <button type="button" className="secondary" onClick={() => setOpen(false)}>
        Đóng
      </button>
    </form>
  );
}
