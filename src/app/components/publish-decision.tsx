"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

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
  canPublish,
}: {
  sourceId: string;
  versionId: string;
  branches: Array<{ id: string; name: string }>;
  suggestedBranchId: string | null;
  chunks: Array<{ id: string; refLabel: string }>;
  /** False when there is no draft: there is nothing to publish. */
  canPublish: boolean;
}) {
  const router = useRouter();
  const m = useMutation();
  // Held from a decision that succeeded until the screen it navigates to has
  // taken over: run() releases its own flag at the end of the round trip, and
  // three buttons coming back to life on a page that is leaving is an invitation
  // to publish twice.
  const [leaving, setLeaving] = useState(false);
  const busy = m.busy || leaving;
  const [branchId, setBranchId] = useState(suggestedBranchId ?? "");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(chunkId: string) {
    setSelected((prev) =>
      prev.includes(chunkId) ? prev.filter((id) => id !== chunkId) : [...prev, chunkId],
    );
  }

  const base = `/api/source/${sourceId}/version/${versionId}`;

  // A decision reads the new page's id back off the response and goes there.
  async function publish(verification: "verified" | "unverified") {
    const node = await m.runJson<{ id: string }>(`${base}/publish`, {
      body: {
        branchId,
        verification,
        ...(selected.length ? { excerptChunkIds: selected } : {}),
      },
    });
    if (!node) return;
    setLeaving(true);
    router.push(`/tree/node/${node.id}`);
  }

  async function reject() {
    if (!(await m.run(`${base}/reject`))) return;
    setLeaving(true);
    router.push("/review");
  }

  return (
    <div className="panel">
      <h2>
        {T.publishDecision} {T.publish.toLowerCase()}
      </h2>
      <SayMutation m={m} />
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
          disabled={busy || !branchId || !canPublish}
          label={busy ? T.loading : T.publishVerified}
          title={T.confirmPublishVerifiedTitle}
          body={T.confirmPublishVerifiedBody}
          confirmLabel={T.publish}
          onConfirm={() => publish("verified")}
        />
        <ConfirmButton
          className="secondary"
          disabled={busy || !branchId || !canPublish}
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
