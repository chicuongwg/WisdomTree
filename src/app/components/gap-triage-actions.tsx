"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

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
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState("");
  const [nodeId, setNodeId] = useState("");

  async function act(action: string, body?: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/source/gap-request/${requestId}/${action}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="panel">
      <h2>{T.triage}</h2>
      {error && <p className="error-text">{error}</p>}
      {state === "submitted" && (
        <button disabled={busy} onClick={() => act("triage")}>
          {T.triage}
        </button>
      )}
      {state === "triaged" && (
        <>
          <div className="field">
            <label htmlFor="gap-branch">{T.convertToBranch} — chuyên đề đích</label>
            <select id="gap-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">— chọn chuyên đề —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gap-node">Hoặc trang tri thức đích</label>
            <select id="gap-node" value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              <option value="">— không chọn —</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
          <p>
            <button
              disabled={busy || (!branchId && !nodeId)}
              onClick={() =>
                act("convert", {
                  ...(branchId ? { branchId } : {}),
                  ...(nodeId ? { nodeId } : {}),
                })
              }
            >
              {T.convertToBranch}
            </button>{" "}
            <button className="danger" disabled={busy} onClick={() => act("reject")}>
              {T.reject}
            </button>
          </p>
        </>
      )}
      {["triaged", "converted_to_branch", "rejected"].includes(state) && (
        <button className="secondary" disabled={busy} onClick={() => act("archive")}>
          {T.archive}
        </button>
      )}
    </div>
  );
}
