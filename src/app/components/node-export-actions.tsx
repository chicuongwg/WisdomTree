"use client";

import { useEffect, useRef, useState } from "react";

// Node Detail export action (user-screen-specs.md): "Xuất docx / pdf" — POST
// the render job (202 JobRef), poll GET /api/jobs/{jobId}, then show the
// signed download link. Converter warnings (e.g. the pandoc-unavailable stub)
// are surfaced, never hidden.

type JobStatus = {
  jobId: string;
  state: "queued" | "running" | "succeeded" | "failed" | "dead";
  result?: { downloadUrl: string; converterWarnings: string[] };
};

export function NodeExportActions({ nodeId }: { nodeId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function poll(jobId: string) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) {
      setError("Không kiểm tra được trạng thái xuất tệp.");
      setBusy(false);
      return;
    }
    const status = (await res.json()) as JobStatus;
    setJob(status);
    if (status.state === "queued" || status.state === "running") {
      timer.current = setTimeout(() => void poll(jobId), 1200);
    } else {
      setBusy(false);
      if (status.state !== "succeeded") setError("Xuất tệp thất bại. Vui lòng thử lại.");
    }
  }

  async function start(format: "docx" | "pdf") {
    setBusy(true);
    setError(null);
    setJob(null);
    const res = await fetch(`/api/tree/nodes/${nodeId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });
    if (res.status !== 202) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    const ref = (await res.json()) as JobStatus;
    void poll(ref.jobId);
  }

  return (
    <div className="panel">
      <h2>Xuất tài liệu</h2>
      {error && <p className="error-text">{error}</p>}
      <p>
        <button disabled={busy} onClick={() => start("docx")}>
          Xuất docx
        </button>{" "}
        <button disabled={busy} onClick={() => start("pdf")}>
          Xuất pdf
        </button>
      </p>
      {busy && <p className="muted">Đang xuất tệp…</p>}
      {job?.state === "succeeded" && job.result && (
        <p>
          <a className="button" href={job.result.downloadUrl}>
            Tải tệp đã xuất
          </a>
          {job.result.converterWarnings.length > 0 && (
            <span className="meta">
              Lưu ý: {job.result.converterWarnings.join("; ")}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
