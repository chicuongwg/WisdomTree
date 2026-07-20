"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deadlineTypeLabel, T } from "@/lib/vi";

// Create/edit form for a deadline (user-screen-specs.md § Deadlines). Reminder
// offsets are entered as comma-separated durations ("7 days, 1 day") and
// stored verbatim as Postgres intervals.

type SpaceOption = { id: string; name: string };
type Existing = {
  id: string;
  spaceId: string;
  title: string;
  type: string;
  dueAt: string; // ISO
  reminderOffsets: string[];
  version: number;
};

const TYPES = ["conference", "funding", "report", "milestone"] as const;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DeadlineForm({
  spaces,
  existing,
}: {
  spaces: SpaceOption[];
  existing?: Existing;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [spaceId, setSpaceId] = useState(existing?.spaceId ?? spaces[0]?.id ?? "");
  const [type, setType] = useState(existing?.type ?? "milestone");
  const [dueAt, setDueAt] = useState(existing ? toLocalInput(existing.dueAt) : "");
  const [offsets, setOffsets] = useState((existing?.reminderOffsets ?? ["7 days", "1 day"]).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      spaceId,
      title,
      type,
      dueAt: new Date(dueAt).toISOString(),
      reminderOffsets: offsets
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...(existing ? { expectedVersion: existing.version } : {}),
    };
    const res = await fetch(existing ? `/api/deadlines/${existing.id}` : "/api/deadlines", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!existing) setTitle("");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="dl-title">{T.title}</label>
        <input id="dl-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="dl-space">{T.project}</label>
        <select id="dl-space" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} required>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="dl-type">{T.deadlineType}</label>
        <select id="dl-type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {deadlineTypeLabel[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="dl-due">{T.dueAtLabel}</label>
        <input id="dl-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="dl-offsets">{T.reminderOffsets}</label>
        <input id="dl-offsets" type="text" value={offsets} onChange={(e) => setOffsets(e.target.value)} />
        <span className="meta">
          Ví dụ: 7 days, 1 day
        </span>
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? T.loading : existing ? T.save : T.createDeadline}
      </button>
    </form>
  );
}
