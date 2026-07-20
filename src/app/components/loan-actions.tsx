"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

export function LoanActions({ ticketId, state }: { ticketId: string; state: string }) {
  const m = useMutation();
  const [dueAt, setDueAt] = useState("");

  // ponytail: one busy flag for the row, so every button in it shows the
  // pending label rather than only the one that was pressed.
  const act = (action: "approve" | "decline" | "borrow" | "return", body?: object) =>
    void m.run(`/api/catalog/loan/${ticketId}/${action}`, body ? { body } : undefined);

  return (
    <div>
      <SayMutation m={m} />
      {state === "requested" && (
        <div className="button-row">
          <button disabled={m.busy} onClick={() => act("approve")}>
            {m.busy ? T.loading : T.approve}
          </button>
          <ConfirmButton
            className="danger"
            disabled={m.busy}
            label={m.busy ? T.loading : T.decline}
            title={T.confirmDeclineLoanTitle}
            body={T.confirmDeclineLoanBody}
            onConfirm={() => act("decline")}
          />
        </div>
      )}
      {state === "approved" && (
        <span className="button-row">
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            aria-label={T.dueDate}
          />
          <button
            disabled={m.busy || !dueAt}
            onClick={() => act("borrow", { dueAt: new Date(dueAt).toISOString() })}
          >
            {m.busy ? T.loading : T.lend}
          </button>
        </span>
      )}
      {(state === "borrowed" || state === "overdue") && (
        <ConfirmButton
          disabled={m.busy}
          label={m.busy ? T.loading : T.markReturned}
          title={T.confirmMarkReturnedTitle}
          body={T.confirmMarkReturnedBody}
          onConfirm={() => act("return")}
        />
      )}
    </div>
  );
}
