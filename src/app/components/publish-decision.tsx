"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { ConfirmButton } from "./confirm-button";
import { Say } from "./say";

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

  // ponytail: not useMutation() — a decision reads the new node's id back off
  // the response and navigates to it, and busy stays set on the way out so the
  // buttons cannot come back to life while the screen is leaving.
  const base = `/api/source/${sourceId}/version/${versionId}`;
  async function decide(path: string, body?: object): Promise<Response | null> {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res;
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    setError(payload?.message ?? T.genericError);
    setBusy(false);
    return null;
  }

  async function publish(verification: "verified" | "unverified") {
    const res = await decide(`${base}/publish`, {
      branchId,
      verification,
      ...(selected.length ? { excerptChunkIds: selected } : {}),
    });
    if (!res) return;
    const node = (await res.json()) as { id: string };
    router.push(`/tree/node/${node.id}`);
    router.refresh();
  }

  async function reject() {
    if (!(await decide(`${base}/reject`))) return;
    router.push("/review");
    router.refresh();
  }

  return (
    <div className="panel">
      <h2>
        {T.publishDecision} {T.publish.toLowerCase()}
      </h2>
      <Say error={error} />
      <div className="field">
        <label htmlFor="target-branch">{T.branch} đích</label>
        <select id="target-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">{T.chooseBranch}</option>
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
      {/* ponytail: one busy flag for the panel, so all three decisions show the
          pending label rather than only the one that was pressed. */}
      <div className="button-row">
        <ConfirmButton
          disabled={busy || !branchId}
          label={busy ? T.loading : T.publishVerified}
          title={T.confirmPublishVerifiedTitle}
          body={T.confirmPublishVerifiedBody}
          confirmLabel={T.publish}
          onConfirm={() => publish("verified")}
        />
        <ConfirmButton
          className="secondary"
          disabled={busy || !branchId}
          label={busy ? T.loading : T.publishUnverified}
          title={T.confirmPublishUnverifiedTitle}
          body={T.confirmPublishUnverifiedBody}
          confirmLabel={T.publish}
          onConfirm={() => publish("unverified")}
        />
        <ConfirmButton
          className="danger"
          disabled={busy}
          label={busy ? T.loading : T.reject}
          title={T.confirmRejectCurationTitle}
          body={T.confirmRejectCurationBody}
          onConfirm={reject}
        />
      </div>
    </div>
  );
}
