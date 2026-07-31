"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

export function NodePublicationDecision({
  taskId,
  reviewVersion,
  hasSource,
  disabled,
  approvalDisabled,
}: {
  taskId: string;
  reviewVersion: number;
  hasSource: boolean;
  disabled: boolean;
  approvalDisabled: boolean;
}) {
  const router = useRouter();
  const m = useMutation();
  const [note, setNote] = useState("");
  const [leaving, setLeaving] = useState(false);
  const busy = m.busy || leaving;

  async function decide(
    decision: "approved" | "rejected" | "changes_requested",
    verification?: "unverified" | "verified",
  ) {
    const result = await m.runJson<{ id?: string; state?: string }>(
      `/api/review/node-publication/${taskId}/decision`,
      {
        body: {
          decision,
          verification,
          expectedReviewVersion: reviewVersion,
          note,
        },
      },
    );
    if (!result) return;
    setLeaving(true);
    router.push(result.id ? `/tree/node/${result.id}` : "/review");
  }

  return (
    <div className="panel">
      <h2>Quyết định kiểm chéo</h2>
      <SayMutation m={m} />
      <div className="field">
        <label htmlFor="publication-note">
          Nhận xét <span className="muted">(bắt buộc khi yêu cầu sửa hoặc từ chối)</span>
        </label>
        <textarea
          id="publication-note"
          rows={4}
          value={note}
          disabled={busy || disabled}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className="button-row">
        {hasSource && (
          <ConfirmButton
            disabled={busy || disabled || approvalDisabled}
            label={busy ? T.loading : "Duyệt — đã thẩm định"}
            title="Xuất bản bản đề cử đã thẩm định?"
            body="Hệ thống sẽ tạo một trang mới trên cây chung từ đúng snapshot đang xem."
            confirmLabel={T.publish}
            onConfirm={() => void decide("approved", "verified")}
          />
        )}
        <ConfirmButton
          className="secondary"
          disabled={busy || disabled || approvalDisabled}
          label={busy ? T.loading : "Duyệt — chưa thẩm định"}
          title="Xuất bản bản đề cử chưa thẩm định?"
          body="Hệ thống sẽ tạo một trang mới trên cây chung từ đúng snapshot đang xem."
          confirmLabel={T.publish}
          onConfirm={() => void decide("approved", "unverified")}
        />
        <button
          type="button"
          className="secondary"
          disabled={busy || disabled || !note.trim()}
          onClick={() => void decide("changes_requested")}
        >
          Yêu cầu chỉnh sửa
        </button>
        <ConfirmButton
          className="danger"
          disabled={busy || disabled || !note.trim()}
          label={busy ? T.loading : T.reject}
          title="Từ chối đề cử?"
          body={note.trim()}
          confirmLabel={T.reject}
          onConfirm={() => void decide("rejected")}
        />
      </div>
    </div>
  );
}
