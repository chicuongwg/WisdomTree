"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

/** Node Detail Admin/Op controls: archive, and merge into a canonical node. */
export function NodeAdminActions({
  nodeId,
  candidates,
}: {
  nodeId: string;
  candidates: Array<{ id: string; title: string }>;
}) {
  const m = useMutation();
  const [canonicalNodeId, setCanonicalNodeId] = useState("");

  // ponytail: one busy flag for the panel, so both buttons show the pending
  // label rather than only the one that was pressed.
  return (
    <div className="panel">
      <h2>{T.nodeAdmin}</h2>
      <SayMutation m={m} />
      <div>
        <ConfirmButton
          className="danger"
          disabled={m.busy}
          label={m.busy ? T.loading : T.archive}
          title={T.confirmArchiveNodeTitle}
          body={T.confirmArchiveNodeBody}
          onConfirm={() => void m.run(`/api/tree/nodes/${nodeId}/archive`)}
        />
      </div>
      <div className="field">
        <label htmlFor="canonical">
          {T.merge} {T.mergeCanonicalLabel}
        </label>
        <select id="canonical" value={canonicalNodeId} onChange={(e) => setCanonicalNodeId(e.target.value)}>
          <option value="">{T.chooseCanonicalNode}</option>
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
          disabled={m.busy || !canonicalNodeId}
          label={m.busy ? T.loading : T.merge}
          title={T.confirmMergeTitle}
          body={T.confirmMergeBody}
          onConfirm={() => void m.run(`/api/tree/nodes/${nodeId}/merge`, { body: { canonicalNodeId } })}
        />
      </div>
    </div>
  );
}
