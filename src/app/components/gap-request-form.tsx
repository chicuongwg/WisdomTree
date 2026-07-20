"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

/**
 * Intake without a file: say what the collection is missing and let an
 * Admin/Op triage it. The counterpart to UploadForm on the same screen.
 */
export function GapRequestForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSent(false);
    const res = await fetch("/api/source/gap-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    setTitle("");
    setDescription("");
    setSent(true);
    router.refresh();
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      {error && <p className="error-text">{error}</p>}
      {sent && <p className="success-text">{T.gapRequestSent}</p>}
      <div className="field">
        <label htmlFor="gap-title">{T.gapRequestTitle}</label>
        <input
          id="gap-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ví dụ: Báo cáo tài chính 2024 của tỉnh"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="gap-description">{T.gapRequestWhy}</label>
        <textarea
          id="gap-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <button type="submit" disabled={busy || !title.trim()}>
        {busy ? T.loading : T.submit}
      </button>
    </form>
  );
}
