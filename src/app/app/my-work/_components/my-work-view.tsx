"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  formatUiDate,
  translate,
} from "@/app/components/ui-next";
import { UnifiedTaskDialog, type TaskItem } from "@/app/components/ui-next/activities-tasks/task-dialog";

export type MyTask = {
  id: string;
  projectId: string;
  activityId?: string | null;
  title: string;
  state: "todo" | "doing" | "done" | "archived";
  priority?: "urgent" | "high" | "medium" | "low";
  kind?: "task" | "feature" | "bug" | "improvement";
  sprint?: string | null;
  estimatePoints?: number | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  assignedTo?: string | null;
  dueAt: Date | string | null;
  startAt?: Date | string | null;
  notes?: string | null;
  version: number;
  canEdit?: boolean;
  project: { id: string; name: string };
  activity: { id: string; title: string } | null;
};

export function MyWorkView({ locale, tasks }: { locale: UiLocale; tasks: MyTask[] }) {
  const router = useRouter();
  const states = ["todo", "doing", "done", "archived"] as const;

  const [tasksState, setTasksState] = useState<MyTask[]>(tasks);
  const [view, setView] = useState<"kanban" | "table" | "list">("kanban");
  const [editing, setEditing] = useState<MyTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transition(task: MyTask, nextState: MyTask["state"]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/app/projects/${encodeURIComponent(task.projectId)}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: nextState,
            expectedVersion: task.version,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to update task");
      }
      const data = await res.json();
      setTasksState((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, state: nextState, version: data.task.version }
            : t,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating task");
    } finally {
      setSaving(false);
    }
  }

  // Convert MyTask to TaskItem for UnifiedTaskDialog
  const dialogTask: TaskItem | null = editing
    ? {
        id: editing.id,
        projectId: editing.projectId,
        activityId: editing.activityId || null,
        title: editing.title,
        state: editing.state,
        priority: editing.priority || "medium",
        kind: editing.kind || "task",
        sprint: editing.sprint || null,
        estimatePoints: editing.estimatePoints ?? null,
        startedAt: editing.startedAt ?? null,
        completedAt: editing.completedAt ?? null,
        assignedTo: editing.assignedTo ?? null,
        dueAt: editing.dueAt,
        startAt: editing.startAt ?? null,
        notes: editing.notes ?? null,
        version: editing.version,
        canEdit: editing.canEdit ?? true,
      }
    : null;

  return (
    <section className="ui-next-work-page ui-next-my-work-page" aria-labelledby="my-work-title">
      <PageHeader
        titleId="my-work-title"
        title={translate(locale, "page.myWork.title")}
        description={translate(locale, "myWork.description")}
      />

      {/* Multi-View Navigation Tabs */}
      <nav className="ui-next-task-views" aria-label={translate(locale, "tasks.views")}>
        <button
          type="button"
          onClick={() => setView("kanban")}
          aria-current={view === "kanban" ? "true" : undefined}
        >
          {translate(locale, "tasks.view.kanban")}
        </button>
        <button
          type="button"
          onClick={() => setView("table")}
          aria-current={view === "table" ? "true" : undefined}
        >
          {translate(locale, "tasks.view.table")}
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          aria-current={view === "list" ? "true" : undefined}
        >
          {translate(locale, "tasks.view.list")}
        </button>
      </nav>

      {error ? (
        <p className="ui-next-work-form__error" role="alert">
          {error}
        </p>
      ) : null}

      {!tasksState.length ? (
        <EmptyState
          title={translate(locale, "myWork.emptyTitle")}
          description={translate(locale, "myWork.emptyDescription")}
        />
      ) : view === "table" ? (
        /* Notion Table View for My Work */
        <div className="ui-next-tasks-table-wrapper">
          <table className="ui-next-tasks-table" aria-label={translate(locale, "page.myWork.title")}>
            <thead>
              <tr>
                <th>{translate(locale, "tasks.title")}</th>
                <th>{translate(locale, "tasks.field.project")}</th>
                <th>{translate(locale, "tasks.field.state")}</th>
                <th>{translate(locale, "tasks.field.priority")}</th>
                <th>{translate(locale, "tasks.field.kind")}</th>
                <th>{translate(locale, "tasks.field.sprint")}</th>
                <th>{translate(locale, "tasks.field.estimatePoints")}</th>
                <th>{translate(locale, "tasks.field.dueAt")}</th>
              </tr>
            </thead>
            <tbody>
              {tasksState.map((task) => (
                <tr key={task.id} onClick={() => setEditing(task)}>
                  <td className="ui-next-tasks-table__title">
                    <strong>{task.title}</strong>
                    {task.activity ? (
                      <small className="ui-next-tasks-table__sub">
                        {task.activity.title}
                      </small>
                    ) : null}
                  </td>
                  <td>
                    <span className="ui-next-my-work-card__project">
                      {task.project.name}
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      tone={
                        task.state === "done"
                          ? "success"
                          : task.state === "doing"
                            ? "information"
                            : "neutral"
                      }
                    >
                      {translate(locale, `tasks.state.${task.state}`)}
                    </StatusBadge>
                  </td>
                  <td>
                    <span className={`ui-next-priority-pill ui-next-priority-pill--${task.priority || "medium"}`}>
                      {translate(locale, `tasks.priority.${task.priority || "medium"}`)}
                    </span>
                  </td>
                  <td>
                    <span className="ui-next-kind-badge">
                      {translate(locale, `tasks.kind.${task.kind || "task"}`)}
                    </span>
                  </td>
                  <td>
                    {task.sprint ? (
                      <span>{task.sprint}</span>
                    ) : (
                      <span className="text-ui-text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {task.estimatePoints != null ? (
                      <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
                    ) : (
                      <span className="text-ui-text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {task.dueAt ? (
                      formatUiDate(task.dueAt, locale)
                    ) : (
                      <span className="text-ui-text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "list" ? (
        /* Detailed List View for My Work */
        <ul className="ui-next-task-list" role="list">
          {tasksState.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="ui-next-task-list__row"
                onClick={() => setEditing(task)}
              >
                <div className="ui-next-my-work-list-main">
                  <span className="ui-next-my-work-card__project">{task.project.name}</span>
                  <strong className="ui-next-my-work-list-title">
                    {task.title}
                  </strong>
                  {task.activity ? (
                    <small className="ui-next-my-work-card__activity">{task.activity.title}</small>
                  ) : null}
                </div>
                <div className="ui-next-my-work-list-meta">
                  <StatusBadge
                    tone={
                      task.state === "done"
                        ? "success"
                        : task.state === "doing"
                          ? "information"
                          : "neutral"
                    }
                  >
                    {translate(locale, `tasks.state.${task.state}`)}
                  </StatusBadge>
                  {task.priority ? (
                    <span className={`ui-next-priority-pill ui-next-priority-pill--${task.priority}`}>
                      {translate(locale, `tasks.priority.${task.priority}`)}
                    </span>
                  ) : null}
                  {task.estimatePoints != null ? (
                    <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
                  ) : null}
                  {task.dueAt ? (
                    <span className="ui-next-my-work-card__due">
                      {formatUiDate(task.dueAt, locale)}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        /* Full Responsive Kanban Board */
        <div
          className="ui-next-kanban ui-next-my-work-kanban"
          aria-label={translate(locale, "tasks.kanban")}
        >
          {states.map((state) => {
            const laneTasks = tasksState.filter((task) => task.state === state);
            return (
              <section
                className="ui-next-kanban__lane"
                key={state}
                aria-labelledby={`my-work-${state}`}
              >
                <header>
                  <h2 id={`my-work-${state}`}>{translate(locale, `tasks.state.${state}`)}</h2>
                  <span>{laneTasks.length}</span>
                </header>
                {laneTasks.length ? (
                  <ul role="list">
                    {laneTasks.map((task) => (
                      <li key={task.id}>
                        <div
                          className="ui-next-kanban__card ui-next-my-work-card"
                          onClick={() => setEditing(task)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEditing(task);
                            }
                          }}
                        >
                          <span className="ui-next-my-work-card__project">
                            {task.project.name}
                          </span>
                          <h3 className="ui-next-my-work-card__title">{task.title}</h3>
                          {task.activity ? (
                            <span className="ui-next-my-work-card__activity">
                              {task.activity.title}
                            </span>
                          ) : null}
                          <div className="ui-next-my-work-card__meta">
                            <StatusBadge
                              tone={
                                task.state === "done"
                                  ? "success"
                                  : task.state === "doing"
                                    ? "information"
                                    : "neutral"
                              }
                            >
                              {translate(locale, `tasks.state.${task.state}`)}
                            </StatusBadge>
                            {task.priority ? (
                              <span className={`ui-next-priority-pill ui-next-priority-pill--${task.priority}`}>
                                {translate(locale, `tasks.priority.${task.priority}`)}
                              </span>
                            ) : null}
                            {task.kind ? (
                              <span className="ui-next-kind-badge">
                                {translate(locale, `tasks.kind.${task.kind}`)}
                              </span>
                            ) : null}
                            {task.estimatePoints != null ? (
                              <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
                            ) : null}
                            {task.dueAt ? (
                              <span className="ui-next-my-work-card__due">
                                {formatUiDate(task.dueAt, locale)}
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="ui-next-kanban__card-footer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="ui-next-kanban__quick-status-wrap">
                              <span className="ui-next-visually-hidden">
                                {translate(locale, "tasks.field.state")}
                              </span>
                              <select
                                className="ui-next-kanban__quick-status"
                                value={task.state}
                                disabled={saving}
                                aria-label={translate(locale, "tasks.field.state")}
                                onChange={(e) =>
                                  void transition(task, e.target.value as MyTask["state"])
                                }
                              >
                                {states.map((s) => (
                                  <option key={s} value={s}>
                                    {translate(locale, `tasks.state.${s}`)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="ui-next-kanban__edit-btn"
                              aria-label={translate(locale, "common.edit")}
                              onClick={() => setEditing(task)}
                            >
                              {translate(locale, "common.edit")}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ui-next-empty">{translate(locale, "tasks.laneEmpty")}</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Unified Notion-Style Task Dialog for Viewing / Editing Task */}
      {dialogTask ? (
        <UnifiedTaskDialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          locale={locale}
          task={dialogTask}
          currentProjectId={dialogTask.projectId}
          onUpdated={(updated) => {
            setTasksState((prev) =>
              prev.map((t) =>
                t.id === updated.id
                  ? {
                      ...t,
                      title: updated.title,
                      state: updated.state,
                      priority: updated.priority,
                      kind: updated.kind,
                      sprint: updated.sprint,
                      estimatePoints: updated.estimatePoints,
                      dueAt: updated.dueAt,
                      startAt: updated.startAt,
                      notes: updated.notes,
                      version: updated.version,
                    }
                  : t,
              ),
            );
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
