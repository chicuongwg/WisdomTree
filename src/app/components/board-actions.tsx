"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, taskLabel } from "@/lib/vi";

// Board interactions (admin-op-screen-specs.md § Board): simple state moves
// between todo/doing/done columns — no drag library — plus task creation.

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
      setError(err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
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

export function TaskCreateForm({ assignees }: { assignees: UserOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, state: "todo", ...(assigneeId ? { assigneeId } : {}) }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    setTitle("");
    setAssigneeId("");
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
      {error && <p className="error-text">{error}</p>}
      <button type="submit" disabled={busy || !title.trim()}>
        {busy ? T.loading : T.createTask}
      </button>
    </form>
  );
}
