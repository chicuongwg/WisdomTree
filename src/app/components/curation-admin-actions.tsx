"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { ConfirmButton } from "./confirm-button";

/**
 * Admin Source Detail actions: assign curation to an editor, or close the
 * curation as rejected (the stored item stays in Library either way).
 */
export function CurationAdminActions({
  sourceId,
  versionId,
  editors,
  currentAssignee,
  curationOpen,
}: {
  sourceId: string;
  versionId: string;
  editors: Array<{ id: string; name: string }>;
  currentAssignee: string | null;
  curationOpen: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState(currentAssignee ?? "");

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

  const base = `/api/source/${sourceId}/version/${versionId}`;
  return (
    <div className="panel">
      <h2>{T.assign}</h2>
      {error && <p className="error-text">{error}</p>}
      <div className="field">
        <label htmlFor="assignee">{T.assignee}</label>
        <select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">— chọn biên tập viên —</option>
          {editors.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      <div className="button-row">
        <button disabled={busy || !assigneeId} onClick={() => act(`${base}/assign`, { assigneeId })}>
          {T.assign}
        </button>
        {curationOpen && (
          <ConfirmButton
            className="danger"
            disabled={busy}
            label={T.reject}
            title={T.confirmRejectCurationTitle}
            body={T.confirmRejectCurationBody}
            onConfirm={() => act(`${base}/reject`)}
          />
        )}
      </div>
    </div>
  );
}
