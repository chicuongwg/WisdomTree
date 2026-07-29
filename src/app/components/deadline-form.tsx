"use client";

import { useState } from "react";
import { deadlineKindLabel, reminderLabel, T } from "@/lib/vi";
import { fromAppInput, toAppInput } from "@/lib/time";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

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
// The `value`s are the Postgres interval wire format, not copy; reminderLabel()
// in vi.ts turns them into words. This form used to own that mapping privately,
// which is why the deadline DETAIL screen — the screen a researcher actually
// opens — had no way to reach it and printed "Nhắc trước: 7 days, 1 day".
const REMINDERS = ["1 day", "3 days", "7 days"] as const;

/* The box shows, and reads back, the app's wall clock — see src/lib/time.ts.
   It used to use the browser's, while the table beside it was rendered on the
   server in the server's: the same deadline could print two different days on
   one screen. */

export function DeadlineForm({ spaces, existing }: { spaces: SpaceOption[]; existing?: Existing }) {
  const m = useMutation();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [spaceId, setSpaceId] = useState(existing?.spaceId ?? spaces[0]?.id ?? "");
  const [type, setType] = useState(existing?.type ?? "milestone");
  const [dueAt, setDueAt] = useState(existing ? toAppInput(existing.dueAt) : "");
  const [offsets, setOffsets] = useState<string[]>(
    existing?.reminderOffsets ?? ["7 days", "1 day"],
  );

  // ponytail: toggling by value, not rebuilding the list from the three boxes —
  // an offset a colleague set outside these choices ("2 days") rides through an
  // edit untouched instead of being silently dropped.
  const toggle = (value: string, on: boolean) =>
    setOffsets((prev) => (on ? [...prev, value] : prev.filter((o) => o !== value)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const saved = await m.run(existing ? `/api/deadlines/${existing.id}` : "/api/deadlines", {
      method: existing ? "PATCH" : "POST",
      ok: existing ? T.changesSaved : T.deadlineCreated,
      body: {
        spaceId,
        title,
        type,
        dueAt: fromAppInput(dueAt).toISOString(),
        reminderOffsets: offsets,
        ...(existing ? { expectedVersion: existing.version } : {}),
      },
    });
    if (saved && !existing) setTitle("");
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="dl-title">{T.title}</label>
        <input
          id="dl-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
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
        <input
          id="dl-due"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          required
        />
      </div>
      <fieldset className="plain">
        <legend>{T.reminderOffsets}</legend>
        {REMINDERS.map((value) => {
          const id = `dl-rem-${value.replace(/\s/g, "-")}`;
          return (
            <div className="checkbox-row" key={value}>
              <input
                id={id}
                type="checkbox"
                checked={offsets.includes(value)}
                onChange={(e) => toggle(value, e.target.checked)}
              />
              <label htmlFor={id}>{reminderLabel(value)}</label>
            </div>
          );
        })}
      </fieldset>
      <SayMutation m={m} />
      <button type="submit" disabled={m.busy}>
        {m.busy ? T.loading : existing ? T.save : T.createDeadline}
      </button>
    </form>
  );
}
