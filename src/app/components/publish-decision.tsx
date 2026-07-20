"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

/**
 * Publish Review decision controls (admin-op-screen-specs.md): approve
 * publish as verified/unverified with target branch and excerpt mapping, or
 * reject publication. Excerpt selections become promotion excerptChunkIds.
 */
export function PublishDecision({
  sourceId,
  versionId,
  branches,
  suggestedBranchId,
  chunks,
}: {
  sourceId: string;
  versionId: string;
  branches: Array<{ id: string; name: string }>;
  suggestedBranchId: string | null;
  chunks: Array<{ id: string; refLabel: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(suggestedBranchId ?? "");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(chunkId: string) {
    setSelected((prev) =>
      prev.includes(chunkId) ? prev.filter((id) => id !== chunkId) : [...prev, chunkId],
    );
  }

  async function publish(verification: "verified" | "unverified") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/source/${sourceId}/version/${versionId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        verification,
        ...(selected.length ? { excerptChunkIds: selected } : {}),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      return;
    }
    const node = (await res.json()) as { id: string };
    router.push(`/tree/node/${node.id}`);
    router.refresh();
  }

  async function reject() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/source/${sourceId}/version/${versionId}/reject`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      return;
    }
    router.push("/review");
    router.refresh();
  }

  return (
    <div className="panel">
      <h2>Quyết định {T.publish.toLowerCase()}</h2>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="field">
        <label htmlFor="target-branch">{T.branch} đích</label>
        <select id="target-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">— chọn chuyên đề —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {chunks.length > 0 && (
        <fieldset className="plain">
          <legend>
            {T.excerpts}
          </legend>
          {chunks.map((c) => (
            <div className="checkbox-row" key={c.id}>
              <input
                id={`chunk-${c.id}`}
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
              />
              <label htmlFor={`chunk-${c.id}`}>{c.refLabel}</label>
            </div>
          ))}
        </fieldset>
      )}
      <p className="button-row">
        <button disabled={busy || !branchId} onClick={() => publish("verified")}>
          {T.publishVerified}
        </button>
        <button className="secondary" disabled={busy || !branchId} onClick={() => publish("unverified")}>
          {T.publishUnverified}
        </button>
        <button className="danger" disabled={busy} onClick={reject}>
          {T.reject}
        </button>
      </p>
    </div>
  );
}
