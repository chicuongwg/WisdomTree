"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  id: string;
  title: string;
  contentMd: string;
  method: string;
  contentSha256: string;
};

export function CandidateReviewList({
  candidates,
  branches,
}: {
  candidates: Candidate[];
  branches: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(candidateId: string, action: "evolve" | "reject", branchId?: string) {
    setBusy(candidateId);
    setError(null);
    const response = await fetch(`/api/vault/candidates/${candidateId}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: action === "evolve" ? JSON.stringify({ branchId }) : undefined,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Không thể xử lý bản trích xuất.");
      setBusy(null);
      return;
    }
    router.refresh();
    setBusy(null);
  }

  if (!candidates.length) return <p className="muted">Không có bản Markdown nào đang chờ duyệt.</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="cards">
        {candidates.map((candidate) => (
          <article className="panel" key={candidate.id}>
            <h2>{candidate.title}</h2>
            <p className="muted">
              Phương thức: {candidate.method} · SHA-256: {candidate.contentSha256.slice(0, 12)}…
            </p>
            <details>
              <summary>Xem Markdown bất biến</summary>
              <pre>{candidate.contentMd}</pre>
            </details>
            <div className="field">
              <label htmlFor={`branch-${candidate.id}`}>Chuyên đề cá nhân</label>
              <select id={`branch-${candidate.id}`} defaultValue="" disabled={busy === candidate.id}>
                <option value="" disabled>
                  — chọn chuyên đề —
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="button-row">
              <button
                type="button"
                disabled={busy === candidate.id || !branches.length}
                onClick={() => {
                  const select = document.getElementById(
                    `branch-${candidate.id}`,
                  ) as HTMLSelectElement | null;
                  if (select?.value) void act(candidate.id, "evolve", select.value);
                  else setError("Hãy chọn chuyên đề cá nhân.");
                }}
              >
                Duyệt và evolve
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy === candidate.id}
                onClick={() => void act(candidate.id, "reject")}
              >
                Từ chối
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
