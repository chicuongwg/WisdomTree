"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { ConfirmButton } from "./confirm-button";

export function LoanActions({ ticketId, state }: { ticketId: string; state: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState("");

  async function act(action: "approve" | "decline" | "borrow" | "return", body?: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/catalog/loan/${ticketId}/${action}`, {
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

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {state === "requested" && (
        <div className="button-row">
          <button disabled={busy} onClick={() => act("approve")}>
            {T.approve}
          </button>
          <ConfirmButton
            className="danger"
            disabled={busy}
            label={T.decline}
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
          <button disabled={busy || !dueAt} onClick={() => act("borrow", { dueAt: new Date(dueAt).toISOString() })}>
            {T.lend}
          </button>
        </span>
      )}
      {(state === "borrowed" || state === "overdue") && (
        <ConfirmButton
          disabled={busy}
          label={T.markReturned}
          title={T.confirmMarkReturnedTitle}
          body={T.confirmMarkReturnedBody}
          onConfirm={() => act("return")}
        />
      )}
    </div>
  );
}
