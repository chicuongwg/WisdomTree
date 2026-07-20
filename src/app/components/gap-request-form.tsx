"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

/**
 * Intake without a file: say what the collection is missing and let an
 * Admin/Op triage it. The counterpart to UploadForm on the same screen.
 */
export function GapRequestForm() {
  const m = useMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sent = await m.run("/api/source/gap-request", {
      body: { title, description },
      ok: T.gapRequestSent,
    });
    if (!sent) return;
    setTitle("");
    setDescription("");
  }

  return (
    <form onSubmit={submit}>
      <SayMutation m={m} />
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
      <button type="submit" disabled={m.busy || !title.trim()}>
        {/* Not the bare T.submit: this screen shows two forms, and two buttons
            reading only "Gửi" say nothing about which one sends what.
            TODO(vi): move to src/lib/vi.ts */}
        {m.busy ? T.loading : "Gửi đề xuất"}
      </button>
    </form>
  );
}
