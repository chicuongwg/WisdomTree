"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deadlineKindLabel, T } from "@/lib/vi";
import { Say } from "./say";

// Create/edit form for a deadline (user-screen-specs.md § Deadlines).
//
// Reminder offsets go to the API as an array of Postgres interval literals —
// the dispatcher subtracts them straight from due_at in SQL, so the wire words
// stay English ("7 days"). Asking a Vietnamese researcher to TYPE those was the
// bug; the choices below are the same literals behind Vietnamese labels.

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

// The column is interval[] and the API takes an array, so more than one
// reminder is genuinely allowed — checkboxes, not a select.
// The `value`s are the Postgres interval wire format, not copy.
const REMINDERS = [
  { value: "1 day", label: T.reminderOneDay },
  { value: "3 days", label: T.reminderThreeDays },
  { value: "7 days", label: T.reminderOneWeek },
] as const;

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
  const [offsets, setOffsets] = useState<string[]>(existing?.reminderOffsets ?? ["7 days", "1 day"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // ponytail: toggling by value, not rebuilding the list from the three boxes —
  // an offset a colleague set outside these choices ("2 days") rides through an
  // edit untouched instead of being silently dropped.
  const toggle = (value: string, on: boolean) =>
    setOffsets((prev) => (on ? [...prev, value] : prev.filter((o) => o !== value)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const payload = {
      spaceId,
      title,
      type,
      dueAt: new Date(dueAt).toISOString(),
      reminderOffsets: offsets,
      ...(existing ? { expectedVersion: existing.version } : {}),
    };
    // ponytail: useMutation only POSTs and the edit path is a PATCH, so this
    // one keeps its own request and borrows just <Say> for the answer.
    const res = await fetch(existing ? `/api/deadlines/${existing.id}` : "/api/deadlines", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    setBusy(false);
    setOk(existing ? T.changesSaved : T.deadlineCreated);
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
              {deadlineKindLabel(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="dl-due">{T.dueAtLabel}</label>
        <input id="dl-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
      </div>
      <fieldset className="plain">
        <legend>{T.reminderOffsets}</legend>
        {REMINDERS.map((r) => {
          const id = `dl-rem-${r.value.replace(/\s/g, "-")}`;
          return (
            <div className="checkbox-row" key={r.value}>
              <input
                id={id}
                type="checkbox"
                checked={offsets.includes(r.value)}
                onChange={(e) => toggle(r.value, e.target.checked)}
              />
              <label htmlFor={id}>{r.label}</label>
            </div>
          );
        })}
      </fieldset>
      <Say error={error} ok={ok} />
      <button type="submit" disabled={busy}>
        {busy ? T.loading : existing ? T.save : T.createDeadline}
      </button>
    </form>
  );
}
