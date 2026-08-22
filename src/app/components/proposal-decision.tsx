"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

/**
 * Shared decision block for both proposal kinds (promotion of a personal node,
 * change to a promoted node). The endpoint decides which; `withNote` follows
 * the service contract — promotions require a note on reject/changes, change
 * reviews carry no note.
 */
export function ProposalDecision({
  endpoint,
  withNote,
  hasSource,
  disabled,
  approvalDisabled,
}: {
  endpoint: string;
  withNote: boolean;
  hasSource: boolean;
  disabled: boolean;
  approvalDisabled: boolean;
}) {
  const router = useRouter();
  const m = useMutation();
  const [note, setNote] = useState("");
  const [leaving, setLeaving] = useState(false);
  const busy = m.busy || leaving;
  const negativeDisabled = busy || disabled || (withNote && !note.trim());

  async function decide(
    decision: "approved" | "rejected" | "changes_requested",
    verification?: "unverified" | "verified",
  ) {
    const result = await m.runJson<{ id?: string; state?: string }>(endpoint, {
      body: { decision, verification, ...(withNote ? { note } : {}) },
    });
    if (!result) return;
    setLeaving(true);
    router.push(result.id ? `/tree/node/${result.id}` : "/review");
  }

  return (
    <div className="panel">
      <h2>{T.reviewDecisionHeading}</h2>
      <SayMutation m={m} />
      {withNote && (
        <div className="field">
          <label htmlFor="decision-note">
            {T.reviewNoteLabel} <span className="muted">{T.reviewNoteRequiredHint}</span>
          </label>
          <textarea
            id="decision-note"
            rows={4}
            value={note}
            disabled={busy || disabled}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      )}
      <div className="button-row">
        {hasSource && (
          <ConfirmButton
            disabled={busy || disabled || approvalDisabled}
            label={busy ? T.loading : T.approveVerified}
            title={T.approveVerifiedTitle}
            body={T.applySnapshotBody}
            confirmLabel={T.publish}
            onConfirm={() => void decide("approved", "verified")}
          />
        )}
        <ConfirmButton
          className="secondary"
          disabled={busy || disabled || approvalDisabled}
          label={busy ? T.loading : T.approveUnverified}
          title={T.approveUnverifiedTitle}
          body={T.applySnapshotBody}
          confirmLabel={T.publish}
          onConfirm={() => void decide("approved", "unverified")}
        />
        <button
          type="button"
          className="secondary"
          disabled={negativeDisabled}
          onClick={() => void decide("changes_requested")}
        >
          {T.requestChanges}
        </button>
        <ConfirmButton
          className="danger"
          disabled={negativeDisabled}
          label={busy ? T.loading : T.reject}
          title={T.rejectProposalTitle}
          body={withNote ? note.trim() : T.proposalWillClose}
          confirmLabel={T.reject}
          onConfirm={() => void decide("rejected")}
        />
      </div>
    </div>
  );
}
