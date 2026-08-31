"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { translateApiError } from "@/lib/vi";
import { DiffView } from "./diff-view";

type Review = {
  proposalId: string;
  authorId: string;
  authorName: string;
  contentMd: string;
  title: string;
  kind: "vi" | "en";
  currentContentMd: string;
};

export function InlineDraftReview({
  nodeId,
  actorId,
  reviews,
}: {
  nodeId: string;
  actorId: string;
  reviews: Review[];
}) {
  const router = useRouter();
  const [verification, setVerification] = useState<"unverified" | "verified">("unverified");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function decide(review: Review, decision: "approved" | "rejected" | "changes_requested") {
    setBusy(true);
    setMessage("");
    const url =
      review.kind === "vi"
        ? `/api/tree/nodes/${nodeId}/proposals/${review.proposalId}/review`
        : `/api/tree/translation-proposals/${review.proposalId}/decision`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, ...(review.kind === "vi" ? { verification } : {}) }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) setMessage(translateApiError(body?.code, body?.details, body?.message));
    else router.refresh();
    setBusy(false);
  }

  if (!reviews.length) return null;
  return (
    <section className="panel" aria-label="Bản nháp chờ duyệt">
      <h2>Bản nháp chờ duyệt</h2>
      {reviews.map((review) => (
        <div key={review.proposalId}>
          <h3>
            {review.kind.toUpperCase()} · {review.title}
          </h3>
          <p className="meta">Người gửi: {review.authorName}</p>
          <DiffView before={review.currentContentMd} after={review.contentMd} />
          {review.authorId === actorId ? (
            <p className="muted">Bạn không thể tự duyệt bản nháp của mình.</p>
          ) : (
            <p>
              {review.kind === "vi" && (
                <select
                  aria-label="Mức thẩm định sau khi duyệt"
                  value={verification}
                  onChange={(event) =>
                    setVerification(event.target.value as "unverified" | "verified")
                  }
                >
                  <option value="unverified">Chưa thẩm định</option>
                  <option value="verified">Đã thẩm định</option>
                </select>
              )}{" "}
              <button disabled={busy} onClick={() => void decide(review, "approved")}>
                Duyệt
              </button>{" "}
              <button disabled={busy} onClick={() => void decide(review, "changes_requested")}>
                Yêu cầu sửa
              </button>{" "}
              <button disabled={busy} onClick={() => void decide(review, "rejected")}>
                Từ chối
              </button>
            </p>
          )}
        </div>
      ))}
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
