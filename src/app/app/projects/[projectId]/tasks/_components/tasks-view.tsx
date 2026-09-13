"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  EmptyState,
  PageHeader,
  StatusBadge,
  formatUiDate,
  translate,
} from "@/app/components/ui-next";

type Task = {
  id: string;
  title: string;
  state: "todo" | "doing" | "done" | "archived";
  assignedTo: string | null;
  assigneeName: string | null;
  activityId: string | null;
  dueAt: Date | string | null;
  notes: string | null;
  version: number;
  canEdit: boolean;
};
type Activity = { id: string; title: string };
type Assignee = { id: string; displayName: string };

export function TasksView({
  projectId,
  locale,
  tasks: serverTasks,
  activities,
  assignees,
  canCreate,
  canManageActivity,
  canClaim,
  view = "list",
  initialTaskId,
}: {
  projectId: string;
  locale: UiLocale;
  tasks: Task[];
  activities: Activity[];
  assignees: Assignee[];
  canCreate: boolean;
  canManageActivity: boolean;
  canClaim: boolean;
  view?: "list" | "kanban";
  initialTaskId?: string;
}) {
  const router = useRouter();
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  // Show the persisted result immediately while the refreshed server list arrives.
  const tasks = useMemo(
    () => [
      ...createdTasks.filter((created) => !serverTasks.some((task) => task.id === created.id)),
      ...serverTasks,
    ],
    [createdTasks, serverTasks],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const openedTaskId = useRef<string | null>(null);
  useEffect(() => {
    if (!initialTaskId) {
      openedTaskId.current = null;
      return;
    }
    if (openedTaskId.current === initialTaskId) return;
    const task = tasks.find((item) => item.id === initialTaskId);
    if (task?.canEdit) {
      openedTaskId.current = initialTaskId;
      setEditing(task);
    }
  }, [initialTaskId, tasks]);
  async function call(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    if (!response.ok)
      throw new Error(
        (await response.json().catch(() => ({}))).reason ||
          translate(locale, "error.internal.title"),
      );
    router.refresh();
    return response;
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await call(`/api/app/projects/${encodeURIComponent(projectId)}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          assigneeId: form.get("assigneeId") || null,
          activityId: form.get("activityId") || null,
          dueAt: toIso(form.get("dueAt")),
          notes: form.get("notes"),
        }),
      });
      const { task } = (await response.json()) as { task: Task };
      setCreatedTasks((current) => [
        {
          ...task,
          assigneeName:
            assignees.find((person) => person.id === task.assignedTo)?.displayName ?? null,
        },
        ...current,
      ]);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }
  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await call(
        `/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(editing.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            state: form.get("state"),
            assigneeId: form.get("assigneeId") || null,
            dueAt: toIso(form.get("dueAt")),
            notes: form.get("notes"),
            expectedVersion: editing.version,
          }),
        },
      );
      const activityId = String(form.get("activityId") || "");
      if (canManageActivity && activityId !== (editing.activityId || "")) {
        await call(
          `/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(editing.id)}/activity${activityId ? "" : `?expectedVersion=${editing.version + 1}`}`,
          activityId
            ? {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activityId, expectedVersion: editing.version + 1 }),
              }
            : { method: "DELETE" },
        );
      }
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }
  async function transition(task: Task, state: Task["state"]) {
    setSaving(true);
    setError(null);
    try {
      await call(
        `/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state, expectedVersion: task.version }),
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }
  async function claim(task: Task) {
    setSaving(true);
    setError(null);
    try {
      await call(
        `/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}/claim`,
        { method: "POST" },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="ui-next-work-page" aria-labelledby="tasks-title">
      <PageHeader
        headingLevel={2}
        titleId="tasks-title"
        title={translate(locale, "tasks.title")}
        description={translate(locale, "tasks.description")}
        actions={
          canCreate ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
            >
              {translate(locale, "tasks.new")}
            </Button>
          ) : null
        }
      />
      <nav className="ui-next-task-views" aria-label={translate(locale, "tasks.views")}>
        <Link
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks`}
          aria-current={view === "list" ? "page" : undefined}
        >
          {translate(locale, "tasks.view.list")}
        </Link>
        <Link
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks?view=kanban`}
          aria-current={view === "kanban" ? "page" : undefined}
        >
          {translate(locale, "tasks.view.kanban")}
        </Link>
        <Link href={`/app/calendar?projectId=${encodeURIComponent(projectId)}`}>
          {translate(locale, "nav.calendar")}
        </Link>
      </nav>
      {view === "kanban" ? (
        <Kanban
          projectId={projectId}
          locale={locale}
          tasks={tasks}
          activities={activities}
          canClaim={canClaim}
          saving={saving}
          onTransition={transition}
          onClaim={claim}
          onOpen={setEditing}
        />
      ) : tasks.length ? (
        <ul className="ui-next-task-list" role="list">
          {tasks.map((task) => (
            <li key={task.id}>
              {task.canEdit ? (
                <button
                  type="button"
                  className="ui-next-task-list__row"
                  onClick={() => setEditing(task)}
                >
                  <TaskSummary task={task} activities={activities} locale={locale} />
                </button>
              ) : (
                <div className="ui-next-task-list__row ui-next-task-list__row--readonly">
                  <TaskSummary task={task} activities={activities} locale={locale} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={translate(locale, "tasks.emptyTitle")}
          description={translate(locale, "tasks.emptyDescription")}
          action={
            canCreate ? (
              <Button type="button" variant="primary" onClick={() => setOpen(true)}>
                {translate(locale, "tasks.createFirst")}
              </Button>
            ) : null
          }
        />
      )}
      {error ? (
        <p className="ui-next-work-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <TaskDialog
        open={open}
        onClose={() => setOpen(false)}
        locale={locale}
        title={translate(locale, "tasks.create.title")}
        activities={activities}
        assignees={assignees}
        canManageActivity={canManageActivity}
        saving={saving}
        error={error}
        submitLabel={translate(locale, "tasks.create.submit")}
        onSubmit={create}
      />
      <TaskDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        locale={locale}
        title={translate(locale, "tasks.edit.title")}
        activities={activities}
        assignees={assignees}
        canManageActivity={canManageActivity}
        task={editing}
        saving={saving}
        error={error}
        submitLabel={translate(locale, "common.save")}
        onSubmit={update}
      />
    </section>
  );
}

function Kanban({
  projectId,
  locale,
  tasks,
  activities,
  canClaim,
  saving,
  onTransition,
  onClaim,
  onOpen,
}: {
  projectId: string;
  locale: UiLocale;
  tasks: Task[];
  activities: Activity[];
  canClaim: boolean;
  saving: boolean;
  onTransition: (task: Task, state: Task["state"]) => Promise<void>;
  onClaim: (task: Task) => Promise<void>;
  onOpen: (task: Task) => void;
}) {
  const states = ["todo", "doing", "done"] as const;
  return (
    <div className="ui-next-kanban" aria-label={translate(locale, "tasks.kanban")}>
      {states.map((state) => {
        const laneTasks = tasks.filter((task) => task.state === state);
        return (
          <section
            className="ui-next-kanban__lane"
            key={state}
            aria-labelledby={`task-lane-${state}`}
          >
            <header>
              <h3 id={`task-lane-${state}`}>{translate(locale, `tasks.state.${state}`)}</h3>
              <span>{laneTasks.length}</span>
            </header>
            {laneTasks.length ? (
              <ul role="list">
                {laneTasks.map((task) => (
                  <li className="ui-next-kanban__card" key={task.id}>
                    <Link
                      href={`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}`}
                    >
                      {task.title}
                    </Link>
                    <TaskSummary
                      task={task}
                      activities={activities}
                      locale={locale}
                      showTitle={false}
                    />
                    <div className="ui-next-kanban__actions">
                      {task.assignedTo === null && canClaim ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={saving}
                          onClick={() => void onClaim(task)}
                        >
                          {translate(locale, "tasks.claim")}
                        </Button>
                      ) : null}
                      {task.canEdit
                        ? states
                            .filter((nextState) => nextState !== task.state)
                            .map((nextState) => (
                              <Button
                                key={nextState}
                                type="button"
                                variant="secondary"
                                disabled={saving}
                                onClick={() => void onTransition(task, nextState)}
                              >
                                {translate(locale, "tasks.moveTo", {
                                  status: translate(locale, `tasks.state.${nextState}`),
                                })}
                              </Button>
                            ))
                        : null}
                      {task.canEdit ? (
                        <Button type="button" variant="ghost" onClick={() => onOpen(task)}>
                          {translate(locale, "common.edit")}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{translate(locale, "tasks.laneEmpty")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
function TaskSummary({
  task,
  activities,
  locale,
  showTitle = true,
}: {
  task: Task;
  activities: Activity[];
  locale: UiLocale;
  showTitle?: boolean;
}) {
  const activity = task.activityId
    ? activities.find((item) => item.id === task.activityId)?.title ||
      translate(locale, "tasks.activity")
    : null;
  return (
    <>
      <span className="ui-next-task-summary">
        {showTitle ? <strong>{task.title}</strong> : null}
        <span className="ui-next-task-summary__meta">
          <span>
            <small>{translate(locale, "tasks.meta.assignee")}</small>
            {task.assigneeName || translate(locale, "tasks.unassigned")}
          </span>
          {task.dueAt ? (
            <span>
              <small>{translate(locale, "tasks.meta.due")}</small>
              {formatUiDate(task.dueAt, locale)}
            </span>
          ) : null}
          {activity ? (
            <span>
              <small>{translate(locale, "tasks.meta.activity")}</small>
              {activity}
            </span>
          ) : null}
        </span>
      </span>
      <StatusBadge
        tone={
          task.state === "done" ? "success" : task.state === "doing" ? "information" : "neutral"
        }
      >
        {translate(locale, `tasks.state.${task.state}`)}
      </StatusBadge>
    </>
  );
}
function TaskDialog({
  open,
  onClose,
  locale,
  title,
  activities,
  assignees,
  canManageActivity,
  task,
  saving,
  error,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  locale: UiLocale;
  title: string;
  activities: Activity[];
  assignees: Assignee[];
  canManageActivity: boolean;
  task?: Task | null;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const formId = useId();
  return (
    <Dialog
      footer={
        <div className="ui-next-work-form__actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            {translate(locale, "common.cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={saving}
            loadingLabel={translate(locale, "common.loading")}
          >
            {submitLabel}
          </Button>
        </div>
      }
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={translate(locale, "common.close")}
    >
      <form id={formId} className="ui-next-work-form" onSubmit={onSubmit}>
        <label>
          <span>{translate(locale, "tasks.field.title")}</span>
          <input name="title" defaultValue={task?.title || ""} required maxLength={300} autoFocus />
        </label>
        <label>
          <span>{translate(locale, "tasks.field.assignee")}</span>
          <select name="assigneeId" defaultValue={task?.assignedTo || ""}>
            <option value="">{translate(locale, "tasks.unassigned")}</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </label>
        {canManageActivity ? (
          <label>
            <span>{translate(locale, "tasks.field.activity")}</span>
            <select name="activityId" defaultValue={task?.activityId || ""}>
              <option value="">{translate(locale, "tasks.noActivity")}</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>{translate(locale, "tasks.field.dueAt")}</span>
          <input name="dueAt" type="datetime-local" defaultValue={toLocalDateTime(task?.dueAt)} />
        </label>
        {task ? (
          <label>
            <span>{translate(locale, "tasks.field.state")}</span>
            <select name="state" defaultValue={task.state}>
              {(["todo", "doing", "done", "archived"] as const).map((state) => (
                <option key={state} value={state}>
                  {translate(locale, `tasks.state.${state}`)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>{translate(locale, "tasks.field.notes")}</span>
          <textarea name="notes" rows={3} defaultValue={task?.notes || ""} />
        </label>
        {error ? (
          <p className="ui-next-work-form__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
function toIso(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? new Date(value).toISOString() : null;
}
function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
