"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

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
  const m = useMutation();
  const [assigneeId, setAssigneeId] = useState(currentAssignee ?? "");

  const base = `/api/source/${sourceId}/version/${versionId}`;
  return (
    <div className="panel">
      <h2>{T.assign}</h2>
      <SayMutation m={m} />
      <div className="field">
        <label htmlFor="assignee">{T.assignee}</label>
        <select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">{T.chooseEditor}</option>
          {editors.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      {/* ponytail: one busy flag for the panel, so both buttons show the
          pending label rather than only the one that was pressed. */}
      <div className="button-row">
        <button
          disabled={m.busy || !assigneeId}
          onClick={() => void m.run(`${base}/assign`, { body: { assigneeId } })}
        >
          {m.busy ? T.loading : T.assign}
        </button>
        {curationOpen && (
          <ConfirmButton
            className="danger"
            disabled={m.busy}
            label={m.busy ? T.loading : T.reject}
            title={T.confirmRejectCurationTitle}
            body={T.confirmRejectCurationBody}
            onConfirm={() => void m.run(`${base}/reject`)}
          />
        )}
      </div>
    </div>
  );
}
