"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

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
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      {state === "requested" && (
        <span className="button-row">
          <button disabled={busy} onClick={() => act("approve")}>
            {T.approve}
          </button>
          <button className="danger" disabled={busy} onClick={() => act("decline")}>
            {T.decline}
          </button>
        </span>
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
        <button disabled={busy} onClick={() => act("return")}>
          {T.markReturned}
        </button>
      )}
    </div>
  );
}
