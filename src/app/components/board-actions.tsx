"use client";

import { useState } from "react";
import { T, taskLabel } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

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
  const m = useMutation();
  const moves = (["todo", "doing", "done"] as const).filter((s) => s !== state);

  return (
    <div className="board-actions">
      {moves.map((s) => (
        <button
          key={s}
          className="secondary"
          disabled={m.busy}
          onClick={() =>
            m.run(`/api/tasks/${taskId}`, {
              method: "PATCH",
              body: { state: s, expectedVersion: version },
              ok: T.taskSaved,
            })
          }
        >
          → {taskLabel(s)}
        </button>
      ))}
      <SayMutation m={m} />
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
  const m = useMutation();

  return (
    <>
      <button type="button" disabled={m.busy} onClick={() => m.run(`/api/tasks/${taskId}/claim`)}>
        {T.claimTask}
      </button>
      <SayMutation m={m} />
    </>
  );
}

/** Off the board, still in the record — so the question says exactly that. */
export function TaskArchiveButton({ taskId }: { taskId: string }) {
  const m = useMutation();

  return (
    <>
      <ConfirmButton
        label={T.archive}
        title={T.confirmArchiveTaskTitle}
        body={T.confirmArchiveTaskBody}
        className="secondary"
        disabled={m.busy}
        onConfirm={() => m.run(`/api/tasks/${taskId}/archive`)}
      />
      <SayMutation m={m} />
    </>
  );
}

export function TaskCreateForm({ assignees }: { assignees: UserOption[] }) {
  const m = useMutation();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [startAt, setStartAt] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const created = await m.run("/api/tasks", {
      body: {
        title,
        state: "todo",
        ...(assigneeId ? { assigneeId } : {}),
        // Empty = unscheduled; the field is a local wall-clock time, so it is
        // sent as-is and read back in the same zone the team works in.
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
        // A start turns a deadline into a span, which is what the board reads
        // as "how long there is to do this".
        ...(startAt ? { startAt: new Date(startAt).toISOString() } : {}),
      },
    });
    if (!created) return;
    setTitle("");
    setAssigneeId("");
    setDueAt("");
    setStartAt("");
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
      <SayMutation m={m} />
      <button type="submit" disabled={m.busy || !title.trim()}>
        {m.busy ? T.loading : T.createTask}
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
  const m = useMutation();
  const [startAt, setStartAt] = useState(toLocalInput(task.startAt));
  const [dueAt, setDueAt] = useState(toLocalInput(task.dueAt));
  const [notes, setNotes] = useState(task.notes ?? "");

  // The refreshed page re-renders this form with the new version, so the next
  // save carries a current expectedVersion rather than the stale one.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await m.run(`/api/tasks/${task.id}`, {
      method: "PATCH",
      ok: T.taskSaved,
      body: {
        // Every key is sent, empty included: on this form an emptied date means
        // "unschedule it", which the service reads as null. Absent would mean
        // "leave it", and there would be no way to take a date back off.
        startAt: startAt ? new Date(startAt).toISOString() : null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        notes,
        expectedVersion: task.version,
      },
    });
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
      <SayMutation m={m} />
      <button type="submit" disabled={m.busy}>
        {m.busy ? T.loading : T.save}
      </button>
    </form>
  );
}
