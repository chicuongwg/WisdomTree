"use client";

import { useState } from "react";
import { T, when } from "@/lib/vi";
import { Say } from "./say";

// Admin Console, System section: the audit trail read back. The `action` key
// is rendered raw in <code> on purpose — this is an operator surface, the one
// place an internal identifier is the honest label (it is what the guards and
// the docs call the event). Everything else on the page stays Vietnamese.
// ponytail: no filters; add when the log grows past scrolling.

export type AuditRow = {
  id: string;
  action: string;
  accountability: string;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  details: unknown;
  createdAt: string;
};

/** Compact one-line JSON, cut at ~80 chars; the title attribute keeps it all. */
function compact(details: unknown): { short: string; full: string } | null {
  if (details == null) return null;
  const full = JSON.stringify(details);
  if (full === "{}" || full === "null") return null;
  return { short: full.length > 80 ? `${full.slice(0, 80)}…` : full, full };
}

export function AuditLog({ initial }: { initial: AuditRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A short first page means there is no second page.
  const [done, setDone] = useState(initial.length < 50);

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit?before=${encodeURIComponent(last.createdAt)}`);
      if (!res.ok) throw new Error();
      const page = (await res.json()) as AuditRow[];
      setRows((r) => [...r, ...page]);
      if (page.length < 50) setDone(true);
    } catch {
      setError(T.genericError);
    }
    setBusy(false);
  }

  return (
    <>
      {rows.length === 0 ? (
        <p className="muted">{T.auditEmpty}</p>
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.timeColumn}</th>
                <th scope="col">{T.actorColumn}</th>
                <th scope="col">{T.actionColumn}</th>
                <th scope="col">{T.targetColumn}</th>
                <th scope="col">{T.detailsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = compact(r.details);
                return (
                  <tr key={r.id}>
                    <td>{when(r.createdAt)}</td>
                    {/* "Hệ thống" = no actor (system job) */}
                    <td>{r.actorName ?? <span className="muted">{T.systemActor}</span>}</td>
                    <td>
                      <code className="muted">{r.action}</code>
                    </td>
                    <td>{r.targetType ?? <span className="muted">—</span>}</td>
                    <td>
                      {d ? (
                        <code className="muted" title={d.full}>
                          {d.short}
                        </code>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Say error={error} />
      {!done && rows.length > 0 && (
        <button type="button" className="secondary" disabled={busy} onClick={() => void loadMore()}>
          {busy ? T.loading : T.loadMore}
        </button>
      )}
    </>
  );
}
