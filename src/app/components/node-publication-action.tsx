"use client";

import Link from "next/link";
import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function NodePublicationAction({
  nodeId,
  branches,
  latest,
}: {
  nodeId: string;
  branches: Array<{ id: string; name: string }>;
  latest: {
    state: string;
    targetBranchName: string;
    decisionNote: string | null;
    approvedNodeId: string | null;
    sourceNodeVersion: number;
    currentNodeVersion: number;
  } | null;
}) {
  const m = useMutation();
  const [targetBranchId, setTargetBranchId] = useState("");
  const canSubmit =
    latest?.state !== "approved" || latest.sourceNodeVersion !== latest.currentNodeVersion;

  return (
    <div className="panel">
      <h2>Đề cử lên cây chung</h2>
      <SayMutation m={m} />
      {latest?.state === "pending" ? (
        <p className="muted">
          Đang chờ kiểm chéo để đưa vào chuyên đề “{latest.targetBranchName}”.
        </p>
      ) : (
        <>
          {latest?.state === "approved" && latest.approvedNodeId && (
            <p>
              Đề cử gần nhất đã được duyệt:{" "}
              <Link href={`/tree/node/${latest.approvedNodeId}`}>mở trang chung</Link>.
            </p>
          )}
          {["rejected", "changes_requested"].includes(latest?.state ?? "") && (
            <p className="notice">
              {latest?.state === "rejected" ? "Đề cử bị từ chối." : "Reviewer yêu cầu chỉnh sửa."}
              {latest?.decisionNote ? ` ${latest.decisionNote}` : ""}
            </p>
          )}
          {branches.length && canSubmit ? (
            <>
              <p className="muted">
                Hệ thống sẽ đóng băng nội dung hiện tại. Một reviewer độc lập phải duyệt trước khi
                tạo trang mới trên cây chung.
              </p>
              <div className="field">
                <label htmlFor="publication-target">Chuyên đề chung đích</label>
                <select
                  id="publication-target"
                  value={targetBranchId}
                  disabled={m.busy}
                  onChange={(event) => setTargetBranchId(event.target.value)}
                >
                  <option value="">— chọn chuyên đề —</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={m.busy || !targetBranchId}
                onClick={() =>
                  void m.run(`/api/tree/nodes/${nodeId}/publication-proposals`, {
                    body: { targetBranchId },
                    ok: "Đã gửi đề cử để kiểm chéo.",
                  })
                }
              >
                {m.busy ? T.loading : "Gửi đề cử"}
              </button>
            </>
          ) : !branches.length ? (
            <p className="muted">Bạn chưa có quyền truy cập chuyên đề chung nào để đề cử.</p>
          ) : (
            <p className="muted">
              Hãy chỉnh sửa trang cá nhân trước khi gửi một phiên bản mới để kiểm chéo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
