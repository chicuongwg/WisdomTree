"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

type Props = {
  sourceId: string;
  versionId: string;
  curationState: string | null;
  correctedLatest: string;
  draft: { contentMd: string; suggestedBranchId: string | null; version: number } | null;
  branches: Array<{ id: string; name: string }>;
  readOnly: boolean;
};

/**
 * Assigned Source Task workbench: corrected-text append chain, Markdown-draft
 * save (optimistic-locked; stale saves surface the contract 409), and the
 * ready-for-review transition. Approve/publish stays on the Admin/Op side.
 */
export function CurationWorkbench(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [corrected, setCorrected] = useState(props.correctedLatest);
  const [draftMd, setDraftMd] = useState(props.draft?.contentMd ?? "");
  const [branchId, setBranchId] = useState(props.draft?.suggestedBranchId ?? "");
  const [draftVersion, setDraftVersion] = useState(props.draft?.version ?? null);

  const base = `/api/source/${props.sourceId}/version/${props.versionId}`;
  const active = !props.readOnly && props.curationState === "under_correction";

  async function call(path: string, body?: object): Promise<Response | null> {
    setBusy(true);
    setError(null);
    setOk(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      return null;
    }
    return res;
  }

  async function saveCorrected() {
    const res = await call(`${base}/corrected-text`, { content: corrected });
    if (res) setOk("Đã lưu bản hiệu đính mới.");
  }

  async function saveDraft() {
    const res = await call(`${base}/md-draft`, {
      contentMd: draftMd,
      ...(branchId ? { suggestedBranchId: branchId } : {}),
      ...(draftVersion !== null ? { expectedVersion: draftVersion } : {}),
    });
    if (res) {
      const saved = (await res.json()) as { version: number };
      setDraftVersion(saved.version);
      setOk("Đã lưu bản thảo.");
    }
  }

  async function markReady() {
    const res = await call(`${base}/mark-ready-for-review`);
    if (res) {
      setOk("Đã gửi duyệt. Quản trị/Vận hành sẽ ra quyết định xuất bản.");
      router.refresh();
    }
  }

  return (
    <div>
      {error && <p className="error-text" role="alert">{error}</p>}
      {ok && <p style={{ color: "var(--accent)" }} role="status">{ok}</p>}

      <h2>{T.correctedText}</h2>
      <p className="muted">Mỗi lần lưu tạo một bản mới trong chuỗi hiệu đính (không ghi đè).</p>
      <div className="field" style={{ maxWidth: "none" }}>
        <label htmlFor="corrected">{T.correctedText}</label>
        <textarea
          id="corrected"
          className="editor"
          value={corrected}
          onChange={(e) => setCorrected(e.target.value)}
          disabled={!active}
        />
      </div>
      <button disabled={busy || !active || !corrected.trim()} onClick={saveCorrected}>
        {T.save}
      </button>

      <h2>{T.markdownDraft}</h2>
      <div className="field" style={{ maxWidth: "none" }}>
        <label htmlFor="draft">{T.contentMd}</label>
        <textarea
          id="draft"
          className="editor"
          value={draftMd}
          onChange={(e) => setDraftMd(e.target.value)}
          disabled={!active}
        />
      </div>
      <div className="field">
        <label htmlFor="suggested-branch">{T.suggestedBranch}</label>
        <select
          id="suggested-branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          disabled={!active}
        >
          <option value="">— chưa chọn —</option>
          {props.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <p>
        <button disabled={busy || !active || !draftMd.trim()} onClick={saveDraft}>
          {T.saveDraft}
        </button>{" "}
        <button
          className="secondary"
          disabled={busy || !active || !draftMd.trim()}
          onClick={markReady}
        >
          {T.markReady}
        </button>
      </p>
    </div>
  );
}
