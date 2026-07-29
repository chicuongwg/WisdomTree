"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/vi";
import { Say } from "./say";

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
  // Clearing the pending timer is not enough on its own: a request already in
  // flight resolves after the component is gone and re-arms the timer from its
  // own .then, so leaving the page mid-export left a 1.2s loop running for the
  // life of the tab. Everything below checks this before it acts.
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function poll(jobId: string) {
    let res: Response;
    try {
      res = await fetch(`/api/jobs/${jobId}`);
    } catch {
      if (!alive.current) return;
      setError(T.exportStatusFailed);
      setBusy(false);
      return;
    }
    if (!alive.current) return;
    if (!res.ok) {
      setError(T.exportStatusFailed);
      setBusy(false);
      return;
    }
    const status = (await res.json()) as JobStatus;
    if (!alive.current) return;
    setJob(status);
    if (status.state === "queued" || status.state === "running") {
      timer.current = setTimeout(() => void poll(jobId), 1200);
    } else {
      setBusy(false);
      if (status.state !== "succeeded") setError(T.exportFailed);
    }
  }

  async function start(format: "docx" | "pdf") {
    setBusy(true);
    setError(null);
    setJob(null);
    let res: Response;
    try {
      res = await fetch(`/api/tree/nodes/${nodeId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
    } catch {
      setError(T.genericError);
      setBusy(false);
      return;
    }
    if (res.status !== 202) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    const ref = (await res.json()) as JobStatus;
    void poll(ref.jobId);
  }

  return (
    <div className="panel">
      <h2>{T.exportNode}</h2>
      <Say error={error} />
      <p>
        <button disabled={busy} onClick={() => start("docx")}>
          {T.exportDocx}
        </button>{" "}
        <button disabled={busy} onClick={() => start("pdf")}>
          {T.exportPdf}
        </button>
      </p>
      {busy && (
        <p className="muted" role="status">
          {T.exporting}
        </p>
      )}
      {job?.state === "succeeded" && job.result && (
        <p>
          <a className="button" href={job.result.downloadUrl}>
            {T.downloadExport}
          </a>
          {job.result.converterWarnings.length > 0 && (
            <span className="meta">
              {/* The renderer's warnings are internal English ("stub: pandoc
                  unavailable"); the reader gets the consequence in Vietnamese —
                  what file they actually got and why. */}
              {T.exportWarnings}{" "}
              {/* Only the pandoc case had a Vietnamese sentence; every other
                  warning the renderer can emit was printed in its own English
                  ("stub: …"), which is worse than useless to the reader it is
                  addressed to. An unrecognised one now says the consequence —
                  the file came out, something about it is not standard — and
                  keeps the raw text after it for whoever can act on it. */}
              {job.result.converterWarnings
                .map((w) =>
                  w.includes("pandoc unavailable")
                    ? T.exportPandocMissing
                    : `${T.exportOtherWarning} (${w})`,
                )
                .join("; ")}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
