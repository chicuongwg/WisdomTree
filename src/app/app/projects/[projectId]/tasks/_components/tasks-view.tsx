"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { ProjectTaskKpis } from "@/modules/pm/service";
import {
  Button,
  EmptyState,
  KpiScorecardView,
  PageHeader,
  StatusBadge,
  UnifiedTaskDialog,
  formatUiDate,
  translate,
} from "@/app/components/ui-next";

type Task = {
  id: string;
  projectId: string;
  title: string;
  state: "todo" | "doing" | "done" | "archived";
  priority?: "urgent" | "high" | "medium" | "low";
  kind?: "task" | "feature" | "bug" | "improvement";
  sprint?: string | null;
  estimatePoints?: number | null;
  startedAt?: Date | string | null;
  startedBy?: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  activityId: string | null;
  dueAt: Date | string | null;
  startAt?: Date | string | null;
  completedAt?: Date | string | null;
  completedBy?: string | null;
  createdAt?: Date | string | null;
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
  kpis,
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
  kpis?: ProjectTaskKpis;
  canCreate: boolean;
  canManageActivity: boolean;
  canClaim: boolean;
  view?: "list" | "kanban" | "table" | "sprint" | "kpis";
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

  useEffect(() => {
    function onCreated(e: Event) {
      const custom = e as CustomEvent<{ task: Task; projectId: string }>;
      if (custom.detail?.projectId === projectId && custom.detail.task) {
        setCreatedTasks((prev) => [
          custom.detail.task,
          ...prev.filter((t) => t.id !== custom.detail.task.id),
        ]);
      }
    }
    function onUpdated(e: Event) {
      const custom = e as CustomEvent<{ task: Task; projectId: string }>;
      if (custom.detail?.projectId === projectId && custom.detail.task) {
        setCreatedTasks((prev) => [
          custom.detail.task,
          ...prev.filter((t) => t.id !== custom.detail.task.id),
        ]);
      }
    }
    window.addEventListener("wisdomtree:task-created", onCreated);
    window.addEventListener("wisdomtree:task-updated", onUpdated);
    return () => {
      window.removeEventListener("wisdomtree:task-created", onCreated);
      window.removeEventListener("wisdomtree:task-updated", onUpdated);
    };
  }, [projectId]);
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
        <Link
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks?view=table`}
          aria-current={view === "table" ? "page" : undefined}
        >
          {translate(locale, "tasks.view.table")}
        </Link>
        <Link
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks?view=sprint`}
          aria-current={view === "sprint" ? "page" : undefined}
        >
          {translate(locale, "tasks.view.sprint")}
        </Link>
        <Link
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks?view=kpis`}
          aria-current={view === "kpis" ? "page" : undefined}
        >
          {translate(locale, "tasks.view.kpis")}
        </Link>
        <Link href={`/app/calendar?projectId=${encodeURIComponent(projectId)}`}>
          {translate(locale, "tasks.view.calendar")}
        </Link>
      </nav>
      {view === "kpis" ? (
        <KpiScorecardView locale={locale} kpis={kpis} />
      ) : view === "kanban" ? (
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
      ) : view === "table" ? (
        <TasksTable
          projectId={projectId}
          locale={locale}
          tasks={tasks}
          activities={activities}
          onOpen={setEditing}
        />
      ) : view === "sprint" ? (
        <SprintView
          projectId={projectId}
          locale={locale}
          tasks={tasks}
          activities={activities}
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
      <UnifiedTaskDialog
        open={open || Boolean(editing)}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        locale={locale}
        task={editing}
        currentProjectId={projectId}
        activities={activities}
        assignees={assignees}
        canManageActivity={canManageActivity}
        onCreated={(created) => {
          const newTask: Task = {
            id: created.id,
            projectId: created.projectId,
            title: created.title,
            state: created.state,
            priority: created.priority,
            kind: created.kind,
            sprint: created.sprint,
            estimatePoints: created.estimatePoints,
            startedAt: created.startedAt,
            startedBy: created.startedBy,
            assignedTo: created.assignedTo,
            assigneeName:
              assignees.find((p) => p.id === created.assignedTo)?.displayName ??
              created.assigneeName ??
              null,
            activityId: created.activityId,
            dueAt: created.dueAt,
            startAt: created.startAt,
            completedAt: created.completedAt,
            completedBy: created.completedBy,
            createdAt: created.createdAt,
            notes: created.notes,
            version: created.version,
            canEdit: true,
          };
          setCreatedTasks((current) => [newTask, ...current]);
        }}
        onUpdated={(updated) => {
          const updatedTask: Task = {
            id: updated.id,
            projectId: updated.projectId,
            title: updated.title,
            state: updated.state,
            priority: updated.priority,
            kind: updated.kind,
            sprint: updated.sprint,
            estimatePoints: updated.estimatePoints,
            startedAt: updated.startedAt,
            startedBy: updated.startedBy,
            assignedTo: updated.assignedTo,
            assigneeName:
              assignees.find((p) => p.id === updated.assignedTo)?.displayName ??
              updated.assigneeName ??
              null,
            activityId: updated.activityId,
            dueAt: updated.dueAt,
            startAt: updated.startAt,
            completedAt: updated.completedAt,
            completedBy: updated.completedBy,
            createdAt: updated.createdAt,
            notes: updated.notes,
            version: updated.version,
            canEdit: editing?.canEdit ?? true,
          };
          setCreatedTasks((current) => [
            updatedTask,
            ...current.filter((t) => t.id !== updated.id),
          ]);
        }}
      />
    </section>
  );
}

function TasksTable({
  projectId: _projectId,
  locale,
  tasks,
  activities: _activities,
  onOpen,
}: {
  projectId: string;
  locale: UiLocale;
  tasks: Task[];
  activities: Activity[];
  onOpen: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="ui-next-empty">{translate(locale, "tasks.empty")}</p>;
  }

  return (
    <div className="ui-next-tasks-table-wrapper" role="region" aria-label={translate(locale, "tasks.view.table")}>
      <table className="ui-next-tasks-table">
        <thead>
          <tr>
            <th>{translate(locale, "tasks.title")}</th>
            <th>{translate(locale, "tasks.field.state")}</th>
            <th>{translate(locale, "tasks.field.priority")}</th>
            <th>{translate(locale, "tasks.field.kind")}</th>
            <th>{translate(locale, "tasks.field.assignee")}</th>
            <th>{translate(locale, "tasks.field.sprint")}</th>
            <th>{translate(locale, "tasks.field.estimatePoints")}</th>
            <th>{translate(locale, "tasks.field.dueAt")}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} onClick={() => onOpen(task)}>
              <td className="ui-next-tasks-table__title">
                <strong>{task.title}</strong>
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
                <span className="text-xs text-ui-text-secondary">
                  {task.assigneeName || translate(locale, "tasks.unassigned")}
                </span>
              </td>
              <td>
                <span className="text-xs text-ui-text-muted">
                  {task.sprint || "—"}
                </span>
              </td>
              <td>
                {task.estimatePoints != null ? (
                  <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
                ) : (
                  <span className="text-xs text-ui-text-muted">—</span>
                )}
              </td>
              <td>
                <span className="text-xs text-ui-text-muted">
                  {task.dueAt ? formatUiDate(task.dueAt, locale, { dateStyle: "short" }) : "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SprintView({
  projectId: _projectId,
  locale,
  tasks,
  activities: _activities,
  onOpen,
}: {
  projectId: string;
  locale: UiLocale;
  tasks: Task[];
  activities: Activity[];
  onOpen: (task: Task) => void;
}) {
  const sprintMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const name = task.sprint?.trim() || translate(locale, "tasks.sprint.backlog");
      const list = map.get(name) || [];
      list.push(task);
      map.set(name, list);
    }
    return map;
  }, [tasks, locale]);

  const sprintGroups = Array.from(sprintMap.entries());

  if (tasks.length === 0) {
    return <p className="ui-next-empty">{translate(locale, "tasks.empty")}</p>;
  }

  return (
    <div className="ui-next-sprint-container">
      {sprintGroups.map(([sprintName, sprintTasks]) => {
        const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.estimatePoints ?? 0), 0);
        const completedPoints = sprintTasks
          .filter((t) => t.state === "done")
          .reduce((sum, t) => sum + (t.estimatePoints ?? 0), 0);
        const completedCount = sprintTasks.filter((t) => t.state === "done").length;
        const percent =
          totalPoints > 0
            ? Math.round((completedPoints / totalPoints) * 100)
            : sprintTasks.length > 0
              ? Math.round((completedCount / sprintTasks.length) * 100)
              : 0;

        return (
          <div key={sprintName} className="ui-next-sprint-card">
            <header className="ui-next-sprint-header">
              <div className="ui-next-sprint-header__info">
                <h3 className="ui-next-sprint-header__title">{sprintName}</h3>
                <span className="ui-next-points-pill">
                  {completedCount}/{sprintTasks.length} {translate(locale, "tasks.completed").toLowerCase()}
                </span>
              </div>
              <div className="ui-next-sprint-header__stats">
                <span>
                  {translate(locale, "tasks.sprint.points", {
                    completed: String(completedPoints),
                    total: String(totalPoints),
                  })}
                </span>
                <span className="font-bold text-ui-accent">{percent}%</span>
              </div>
            </header>
            <div className="ui-next-tasks-table-wrapper">
              <table className="ui-next-tasks-table">
                <tbody>
                  {sprintTasks.map((task) => (
                    <tr key={task.id} onClick={() => onOpen(task)}>
                      <td className="ui-next-tasks-table__title">
                        <strong>{task.title}</strong>
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
                        <span className="text-xs text-ui-text-secondary">
                          {task.assigneeName || translate(locale, "tasks.unassigned")}
                        </span>
                      </td>
                      <td>
                        {task.estimatePoints != null ? (
                          <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
                        ) : (
                          <span className="text-xs text-ui-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-ui-text-muted">
                          {task.dueAt ? formatUiDate(task.dueAt, locale, { dateStyle: "short" }) : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
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
                      className="ui-next-kanban__card-title"
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
                    <div className="ui-next-kanban__card-footer">
                      {task.assignedTo === null && canClaim ? (
                        <button
                          type="button"
                          className="ui-next-kanban__claim-btn"
                          disabled={saving}
                          onClick={() => void onClaim(task)}
                        >
                          {translate(locale, "tasks.claim")}
                        </button>
                      ) : null}
                      {task.canEdit ? (
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
                              void onTransition(task, e.target.value as (typeof states)[number])
                            }
                          >
                            {states.map((s) => (
                              <option key={s} value={s}>
                                {translate(locale, `tasks.state.${s}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {task.canEdit ? (
                        <button
                          type="button"
                          className="ui-next-kanban__edit-btn"
                          aria-label={translate(locale, "common.edit")}
                          onClick={() => onOpen(task)}
                        >
                          {translate(locale, "common.edit")}
                        </button>
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
          {task.priority ? (
            <span className={`ui-next-priority-pill ui-next-priority-pill--${task.priority}`}>
              {translate(locale, `tasks.priority.${task.priority}`)}
            </span>
          ) : null}
          {task.estimatePoints != null ? (
            <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
          ) : null}
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

