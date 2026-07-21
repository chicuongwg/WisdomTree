"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

/** Gap-request triage: triaged → converted / rejected → archived. */
export function GapTriageActions({
  requestId,
  state,
  branches,
  nodes,
}: {
  requestId: string;
  state: string;
  branches: Array<{ id: string; name: string }>;
  nodes: Array<{ id: string; title: string }>;
}) {
  const m = useMutation();
  const [branchId, setBranchId] = useState("");
  const [nodeId, setNodeId] = useState("");

  // ponytail: one busy flag for the whole panel, so every button in it shows
  // the pending label — not only the one that was pressed. Per-button pending
  // would need a second state just to name the act in flight.
  const act = (action: string, body?: object) =>
    void m.run(`/api/source/gap-request/${requestId}/${action}`, body ? { body } : undefined);

  return (
    <div className="panel">
      <h2>{T.triage}</h2>
      <SayMutation m={m} />
      {state === "submitted" && (
        <button disabled={m.busy} onClick={() => act("triage")}>
          {m.busy ? T.loading : T.triage}
        </button>
      )}
      {state === "triaged" && (
        <>
          <div className="field">
            <label htmlFor="gap-branch">
              {T.convertToBranch} {T.gapConvertTargetBranch}
            </label>
            <select id="gap-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{T.chooseBranch}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gap-node">{T.gapConvertTargetNode}</label>
            <select id="gap-node" value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              <option value="">{T.chooseNoNode}</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
          <div className="button-row">
            {/* It asks, like its neighbours. This attaches the request to a
                subject and closes it, with no button anywhere that puts it
                back — the only irreversible act on the panel that was firing
                on a single press while reject and archive both stopped to
                ask. */}
            <ConfirmButton
              disabled={m.busy || (!branchId && !nodeId)}
              label={m.busy ? T.loading : T.convertToBranch}
              title={T.confirmConvertGapTitle}
              body={T.confirmConvertGapBody}
              onConfirm={() =>
                act("convert", {
                  ...(branchId ? { branchId } : {}),
                  ...(nodeId ? { nodeId } : {}),
                })
              }
            />
            <ConfirmButton
              className="danger"
              disabled={m.busy}
              label={m.busy ? T.loading : T.reject}
              title={T.confirmRejectGapTitle}
              body={T.confirmRejectGapBody}
              onConfirm={() => act("reject")}
            />
          </div>
        </>
      )}
      {["triaged", "converted_to_branch", "rejected"].includes(state) && (
        <div>
          <ConfirmButton
            className="secondary"
            disabled={m.busy}
            label={m.busy ? T.loading : T.archive}
            title={T.confirmArchiveGapTitle}
            body={T.confirmArchiveGapBody}
            onConfirm={() => act("archive")}
          />
        </div>
      )}
    </div>
  );
}
