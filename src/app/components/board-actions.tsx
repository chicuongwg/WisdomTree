"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, taskLabel } from "@/lib/vi";
import { ConfirmButton } from "./confirm-button";
import { Say } from "./say";

// Board interactions (admin-op-screen-specs.md § Board): simple state moves
// between todo/doing/done columns — no drag library — plus task creation,
// claiming an unheld task, and archiving one off the board.

type UserOption = { id: string; displayName: string };

export function TaskStateButtons({
  taskId,
  state,
  version,
}: {
  taskId: string;
  state: string;
  version: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moves = (["todo", "doing", "done"] as const).filter((s) => s !== state);

  async function move(to: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: to, expectedVersion: version }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="board-actions">
      {moves.map((s) => (
        <button key={s} className="secondary" disabled={busy} onClick={() => move(s)}>
          → {taskLabel(s)}
        </button>
      ))}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

/**
 * Take an unheld task from the pool. The button is only rendered on a card
 * with no holder, but the real guard is the service's WHERE clause: two people
 * pressing at once resolve to one winner and one 409, which lands here as the
 * service's own message ("Việc này đã có người nhận").
 */
export function TaskClaimButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}/claim`, { method: "POST" });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" disabled={busy} onClick={claim}>
        {T.claimTask}
      </button>
      {error && <span className="error-text">{error}</span>}
    </>
  );
}

/** Off the board, still in the record — so the question says exactly that. */
export function TaskArchiveButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}/archive`, { method: "POST" });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <ConfirmButton
        label={T.archive}
        title={T.confirmArchiveTaskTitle}
        body={T.confirmArchiveTaskBody}
        className="secondary"
        onConfirm={archive}
      />
      {error && <span className="error-text">{error}</span>}
    </>
  );
}

export function TaskCreateForm({ assignees }: { assignees: UserOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [startAt, setStartAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        state: "todo",
        ...(assigneeId ? { assigneeId } : {}),
        // Empty = unscheduled; the field is a local wall-clock time, so it is
        // sent as-is and read back in the same zone the team works in.
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
        // A start turns a deadline into a span, which is what the board reads
        // as "how long there is to do this".
        ...(startAt ? { startAt: new Date(startAt).toISOString() } : {}),
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    setTitle("");
    setAssigneeId("");
    setDueAt("");
    setStartAt("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="task-title">{T.title}</label>
        <input id="task-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="task-assignee">{T.assignee}</label>
        <select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">{T.noAssignee}</option>
          {assignees.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="task-start">{T.taskStartAtOptional}</label>
        <input
          id="task-start"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="task-due">{T.taskDueAtOptional}</label>
        <input
          id="task-due"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" disabled={busy || !title.trim()}>
        {busy ? T.loading : T.createTask}
      </button>
    </form>
  );
}

/** An ISO moment as the local wall-clock string `<input type="datetime-local">` wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The editable half of the task detail: the span the work has, and the notes.
 *
 * Assignment is deliberately absent. The board's rule is that an assigned task
 * belongs to whoever holds it — reassigning is not a field on a form, it is a
 * conversation — so this form can widen a deadline and record what happened,
 * and nothing else.
 *
 * expectedVersion rides along on every save. If a colleague saved first the
 * service answers 409 with its own Vietnamese sentence, and that sentence is
 * what the reader sees: swallowing it would mean silently discarding their
 * paragraph and the colleague's both.
 */
export function TaskDetailForm({
  task,
}: {
  task: {
    id: string;
    startAt: string | null;
    dueAt: string | null;
    notes: string | null;
    version: number;
  };
}) {
  const router = useRouter();
  const [startAt, setStartAt] = useState(toLocalInput(task.startAt));
  const [dueAt, setDueAt] = useState(toLocalInput(task.dueAt));
  const [notes, setNotes] = useState(task.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Every key is sent, empty included: on this form an emptied date means
        // "unschedule it", which the service reads as null. Absent would mean
        // "leave it", and there would be no way to take a date back off.
        startAt: startAt ? new Date(startAt).toISOString() : null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        notes,
        expectedVersion: task.version,
      }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    setOk(T.taskSaved);
    setBusy(false);
    // The refreshed page re-renders this form with the new version, so the next
    // save carries a current expectedVersion rather than the stale one.
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="detail-start">{T.startAtLabel}</label>
        <input
          id="detail-start"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="detail-due">{T.dueAtLabel}</label>
        <input
          id="detail-due"
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="detail-notes">{T.taskNotes}</label>
        <textarea
          id="detail-notes"
          rows={10}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={T.taskNotesHint}
        />
      </div>
      <Say error={error} ok={ok} />
      <button type="submit" disabled={busy}>
        {busy ? T.loading : T.save}
      </button>
    </form>
  );
}
