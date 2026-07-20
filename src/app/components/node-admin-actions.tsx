"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { ConfirmButton } from "./confirm-button";

/** Node Detail Admin/Op controls: archive, and merge into a canonical node. */
export function NodeAdminActions({
  nodeId,
  candidates,
}: {
  nodeId: string;
  candidates: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canonicalNodeId, setCanonicalNodeId] = useState("");

  async function act(path: string, body?: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    // Refresh first, clear busy after: the button stays disabled across the
    // round trip so the act cannot be fired twice.
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="panel">
      <h2>Quản trị trang</h2>
      {error && <p className="error-text">{error}</p>}
      <div>
        <ConfirmButton
          className="danger"
          disabled={busy}
          label={T.archive}
          title={T.confirmArchiveNodeTitle}
          body={T.confirmArchiveNodeBody}
          onConfirm={() => act(`/api/tree/nodes/${nodeId}/archive`)}
        />
      </div>
      <div className="field">
        <label htmlFor="canonical">{T.merge} — chọn trang chuẩn</label>
        <select id="canonical" value={canonicalNodeId} onChange={(e) => setCanonicalNodeId(e.target.value)}>
          <option value="">— chọn trang chuẩn —</option>
          {candidates
            .filter((c) => c.id !== nodeId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
        </select>
      </div>
      <div>
        <ConfirmButton
          disabled={busy || !canonicalNodeId}
          label={T.merge}
          title={T.confirmMergeTitle}
          body={T.confirmMergeBody}
          onConfirm={() => act(`/api/tree/nodes/${nodeId}/merge`, { canonicalNodeId })}
        />
      </div>
    </div>
  );
}
