"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import { Dialog } from "../overlays/dialog";
import { Button } from "../primitives/button";
import { StatusBadge } from "../primitives/status-badge";
import { CollaborationSection } from "../collaboration-section";
import { formatUiDate, translate } from "../localization";

export type TaskItem = {
  id: string;
  projectId: string;
  activityId: string | null;
  title: string;
  state: "todo" | "doing" | "done" | "archived";
  priority?: "urgent" | "high" | "medium" | "low";
  kind?: "task" | "feature" | "bug" | "improvement";
  sprint?: string | null;
  estimatePoints?: number | null;
  startedAt?: Date | string | null;
  startedBy?: string | null;
  assignedTo: string | null;
  assigneeName?: string | null;
  dueAt: Date | string | null;
  startAt?: Date | string | null;
  completedAt?: Date | string | null;
  completedBy?: string | null;
  createdAt?: Date | string | null;
  notes: string | null;
  version: number;
  canEdit?: boolean;
};

export type TaskStatusHistoryItem = {
  id: string;
  taskId: string;
  fromState: string | null;
  toState: string;
  changedBy: string;
  changedByName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  notes: string | null;
  createdAt: string | Date;
};

export type ProjectOption = {
  id: string;
  name: string;
  isPersonal?: boolean;
};

export type ActivityOption = {
  id: string;
  title: string;
};

export type AssigneeOption = {
  id: string;
  displayName: string;
};

export interface UnifiedTaskDialogProps {
  open: boolean;
  onClose: () => void;
  locale: UiLocale;
  task?: TaskItem | null;
  projects?: ProjectOption[];
  currentProjectId?: string | null;
  defaultProjectId?: string | null;
  activities?: ActivityOption[];
  assignees?: AssigneeOption[];
  canManageActivity?: boolean;
  defaultDueAt?: Date | string | null;
  placement?: "center" | "end";
  onCreated?: (task: TaskItem) => void;
  onUpdated?: (task: TaskItem) => void;
}

export function UnifiedTaskDialog({
  open,
  onClose,
  locale,
  task,
  projects = [],
  currentProjectId,
  defaultProjectId,
  activities: initialActivities,
  assignees: initialAssignees,
  canManageActivity = true,
  defaultDueAt,
  placement = "center",
  onCreated,
  onUpdated,
}: UnifiedTaskDialogProps) {
  const router = useRouter();
  const rawFormId = useId();
  const formId = `task-form-${rawFormId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const initialProjectId =
    task?.projectId ||
    currentProjectId ||
    defaultProjectId ||
    projects[0]?.id ||
    "";

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [activities, setActivities] = useState<ActivityOption[]>(initialActivities || []);
  const [assignees, setAssignees] = useState<AssigneeOption[]>(initialAssignees || []);
  const [title, setTitle] = useState(task?.title || "");
  const [state, setState] = useState<TaskItem["state"]>(task?.state || "todo");
  const [priority, setPriority] = useState<NonNullable<TaskItem["priority"]>>(task?.priority || "medium");
  const [kind, setKind] = useState<NonNullable<TaskItem["kind"]>>(task?.kind || "task");
  const [sprint, setSprint] = useState(task?.sprint || "");
  const [estimatePoints, setEstimatePoints] = useState(
    task?.estimatePoints != null ? String(task.estimatePoints) : "",
  );
  const [assigneeId, setAssigneeId] = useState(task?.assignedTo || "");
  const [activityId, setActivityId] = useState(task?.activityId || "");
  const [dueAt, setDueAt] = useState(toLocalDateTime(task?.dueAt || defaultDueAt));
  const [startAt, setStartAt] = useState(toLocalDateTime(task?.startAt));
  const [notes, setNotes] = useState(task?.notes || "");
  const [bottomTab, setBottomTab] = useState<"comments" | "history">("comments");
  const [history, setHistory] = useState<TaskStatusHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when task or open status changes
  useEffect(() => {
    if (open) {
      const pid =
        task?.projectId ||
        currentProjectId ||
        defaultProjectId ||
        projects[0]?.id ||
        "";
      setSelectedProjectId(pid);
      setTitle(task?.title || "");
      setState(task?.state || "todo");
      setPriority(task?.priority || "medium");
      setKind(task?.kind || "task");
      setSprint(task?.sprint || "");
      setEstimatePoints(task?.estimatePoints != null ? String(task.estimatePoints) : "");
      setAssigneeId(task?.assignedTo || "");
      setActivityId(task?.activityId || "");
      setDueAt(toLocalDateTime(task?.dueAt || defaultDueAt));
      setStartAt(toLocalDateTime(task?.startAt));
      setNotes(task?.notes || "");
      setError(null);
    }
  }, [open, task, currentProjectId, defaultProjectId, projects, defaultDueAt]);

  // Load status history for existing task
  useEffect(() => {
    if (!open || !task || !selectedProjectId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    fetch(
      `/api/app/projects/${encodeURIComponent(selectedProjectId)}/tasks/${encodeURIComponent(task.id)}/history`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.history)) {
          setHistory(data.history);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [open, task, selectedProjectId]);

  // Dynamically load activities and assignees if project changes and they aren't pre-supplied
  useEffect(() => {
    if (!selectedProjectId) return;
    if (initialActivities && initialAssignees && selectedProjectId === currentProjectId) {
      setActivities(initialActivities);
      setAssignees(initialAssignees);
      return;
    }

    let active = true;
    fetch(`/api/app/projects/${encodeURIComponent(selectedProjectId)}/tasks`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (Array.isArray(data.activities)) setActivities(data.activities);
        if (Array.isArray(data.assignees)) setAssignees(data.assignees);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedProjectId, currentProjectId, initialActivities, initialAssignees]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(translate(locale, "tasks.field.title"));
      return;
    }
    if (!selectedProjectId) {
      setError(translate(locale, "tasks.field.project"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (task) {
        // Update existing task
        const response = await fetch(
          `/api/app/projects/${encodeURIComponent(selectedProjectId)}/tasks/${encodeURIComponent(task.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: cleanTitle,
              state,
              priority,
              kind,
              sprint: sprint.trim() || null,
              estimatePoints: estimatePoints ? Number(estimatePoints) : null,
              assigneeId: assigneeId || null,
              activityId: activityId || null,
              dueAt: toIso(dueAt),
              startAt: toIso(startAt),
              notes: notes.trim() || null,
              expectedVersion: task.version,
            }),
          },
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.reason || translate(locale, "error.internal.title"));
        }

        const data = (await response.json()) as { task: TaskItem };
        const updated = {
          ...data.task,
          assigneeName:
            assignees.find((p) => p.id === data.task.assignedTo)?.displayName ?? null,
        };

        window.dispatchEvent(
          new CustomEvent("wisdomtree:task-updated", {
            detail: { task: updated, projectId: selectedProjectId },
          }),
        );
        onUpdated?.(updated);
        router.refresh();
        onClose();
      } else {
        // Create new task
        const response = await fetch(
          `/api/app/projects/${encodeURIComponent(selectedProjectId)}/tasks`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: cleanTitle,
              state,
              priority,
              kind,
              sprint: sprint.trim() || null,
              estimatePoints: estimatePoints ? Number(estimatePoints) : null,
              assigneeId: assigneeId || null,
              activityId: activityId || null,
              dueAt: toIso(dueAt),
              startAt: toIso(startAt),
              notes: notes.trim() || null,
            }),
          },
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.reason || translate(locale, "error.internal.title"));
        }

        const data = (await response.json()) as { task: TaskItem };
        const created = {
          ...data.task,
          assigneeName:
            assignees.find((p) => p.id === data.task.assignedTo)?.displayName ?? null,
        };

        window.dispatchEvent(
          new CustomEvent("wisdomtree:task-created", {
            detail: { task: created, projectId: selectedProjectId },
          }),
        );
        onCreated?.(created);
        router.refresh();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const projectName =
    selectedProject?.isPersonal
      ? translate(locale, "projects.myProject")
      : selectedProject?.name || "";

  // Check on-time status if task is completed
  const isCompleted = state === "done" || Boolean(task?.completedAt);
  const isOnTime =
    !task?.dueAt ||
    !task?.completedAt ||
    new Date(task.completedAt).getTime() <= new Date(task.dueAt).getTime();

  return (
    <Dialog
      size="wide"
      placement={placement}
      open={open}
      onClose={onClose}
      title={task ? translate(locale, "tasks.edit.title") : translate(locale, "tasks.create.title")}
      closeLabel={translate(locale, "common.close")}
      footer={
        <div className="ui-next-notion-task__actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            {translate(locale, "common.cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={saving}
            loadingLabel={translate(locale, "common.loading")}
            onClick={() => {
              const form = document.getElementById(formId) as HTMLFormElement | null;
              if (form) form.requestSubmit();
            }}
          >
            {task ? translate(locale, "common.save") : translate(locale, "tasks.create.submit")}
          </Button>
        </div>
      }
    >
      <form id={formId} className="ui-next-notion-task" onSubmit={handleSubmit}>
        {/* Large Notion-Style Page Title Input */}
        <div className="ui-next-notion-task__title-row">
          <input
            id="task-dialog-title"
            name="title"
            type="text"
            required
            maxLength={300}
            className="ui-next-notion-task__title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={translate(locale, "tasks.field.titlePlaceholder")}
            autoFocus={!task}
          />
        </div>

        {/* Notion 2-Column Property Grid */}
        <div className="ui-next-notion-task__properties" role="group" aria-label={translate(locale, "tasks.title")}>

          {/* Project Property – full width, only shown when user can choose */}
          {projects.length > 1 && !currentProjectId ? (
            <div className="ui-next-notion-property ui-next-notion-property--full">
              <span className="ui-next-notion-property__label">
                <span>{translate(locale, "tasks.field.project")}</span>
              </span>
              <div className="ui-next-notion-property__value">
                <select
                  className="ui-next-notion-control"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.isPersonal ? translate(locale, "projects.myProject") : proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : currentProjectId ? (
            <div className="ui-next-notion-property ui-next-notion-property--full">
              <span className="ui-next-notion-property__label">
                <span>{translate(locale, "tasks.field.project")}</span>
              </span>
              <div className="ui-next-notion-property__value">
                <span className="ui-next-notion-control ui-next-notion-control--static">
                  {projectName || "—"}
                </span>
              </div>
            </div>
          ) : null}

          {/* Status Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.state")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <select
                name="state"
                className="ui-next-notion-control"
                value={state}
                onChange={(e) => setState(e.target.value as TaskItem["state"])}
              >
                <option value="todo">{translate(locale, "tasks.state.todo")}</option>
                <option value="doing">{translate(locale, "tasks.state.doing")}</option>
                <option value="done">{translate(locale, "tasks.state.done")}</option>
                <option value="archived">{translate(locale, "tasks.state.archived")}</option>
              </select>
            </div>
          </div>

          {/* Assignee Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.assignee")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <select
                name="assigneeId"
                className="ui-next-notion-control"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">{translate(locale, "tasks.unassigned")}</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.priority")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <select
                name="priority"
                className="ui-next-notion-control"
                value={priority}
                onChange={(e) => setPriority(e.target.value as NonNullable<TaskItem["priority"]>)}
              >
                <option value="urgent">{translate(locale, "tasks.priority.urgent")}</option>
                <option value="high">{translate(locale, "tasks.priority.high")}</option>
                <option value="medium">{translate(locale, "tasks.priority.medium")}</option>
                <option value="low">{translate(locale, "tasks.priority.low")}</option>
              </select>
            </div>
          </div>

          {/* Sprint / Cycle Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.sprint")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <input
                name="sprint"
                type="text"
                className="ui-next-notion-control"
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
                placeholder="Sprint 1, Backlog..."
              />
            </div>
          </div>

          {/* Kind / Type Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.kind")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <select
                name="kind"
                className="ui-next-notion-control"
                value={kind}
                onChange={(e) => setKind(e.target.value as NonNullable<TaskItem["kind"]>)}
              >
                <option value="task">{translate(locale, "tasks.kind.task")}</option>
                <option value="feature">{translate(locale, "tasks.kind.feature")}</option>
                <option value="bug">{translate(locale, "tasks.kind.bug")}</option>
                <option value="improvement">{translate(locale, "tasks.kind.improvement")}</option>
              </select>
            </div>
          </div>

          {/* Estimate Points Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.estimatePoints")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <input
                name="estimatePoints"
                type="number"
                min={0}
                max={100}
                className="ui-next-notion-control"
                value={estimatePoints}
                onChange={(e) => setEstimatePoints(e.target.value)}
                placeholder="1, 2, 3, 5, 8..."
              />
            </div>
          </div>

          {/* Activity Property */}
          {canManageActivity ? (
            <div className="ui-next-notion-property">
              <span className="ui-next-notion-property__label">
                <span>{translate(locale, "tasks.field.activity")}</span>
              </span>
              <div className="ui-next-notion-property__value">
                <select
                  name="activityId"
                  className="ui-next-notion-control"
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                >
                  <option value="">{translate(locale, "tasks.noActivity")}</option>
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {/* Due Date Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.dueAt")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <input
                name="dueAt"
                type="datetime-local"
                className="ui-next-notion-control"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          {/* Start Date Property */}
          <div className="ui-next-notion-property">
            <span className="ui-next-notion-property__label">
              <span>{translate(locale, "tasks.field.startAt")}</span>
            </span>
            <div className="ui-next-notion-property__value">
              <input
                name="startAt"
                type="datetime-local"
                className="ui-next-notion-control"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
          </div>

          {/* Started At Timestamp (if started) – full width */}
          {task?.startedAt ? (
            <div className="ui-next-notion-property ui-next-notion-property--full">
              <span className="ui-next-notion-property__label">
                <span>{translate(locale, "tasks.field.startedAt")}</span>
              </span>
              <div className="ui-next-notion-property__value">
                <span className="ui-next-notion-property__static-value">
                  {formatUiDate(task.startedAt, locale, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            </div>
          ) : null}

          {/* Completion Record / KPI Metadata (if completed) – full width */}
          {isCompleted && task?.completedAt ? (
            <div className="ui-next-notion-property ui-next-notion-property--full">
              <span className="ui-next-notion-property__label">
                <span>{translate(locale, "tasks.completed")}</span>
              </span>
              <div className="ui-next-notion-property__value">
                <span className="ui-next-notion-property__static-value">
                  {formatUiDate(task.completedAt, locale, { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <StatusBadge tone={isOnTime ? "success" : "warning"}>
                  {translate(locale, isOnTime ? "tasks.onTime" : "tasks.late")}
                </StatusBadge>
              </div>
            </div>
          ) : null}
        </div>

        {/* Divider */}
        <hr className="ui-next-notion-task__divider" />

        {/* Notion Notes & Description Block */}
        <div className="ui-next-notion-task__notes-section">
          <label htmlFor="task-dialog-notes" className="ui-next-notion-task__notes-label">
            {translate(locale, "tasks.field.notes")}
          </label>
          <textarea
            id="task-dialog-notes"
            name="notes"
            rows={4}
            className="ui-next-notion-task__notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={translate(locale, "tasks.field.notesPlaceholder")}
          />
        </div>

        {/* Error Banner */}
        {error ? (
          <p className="ui-next-work-form__error" role="alert">
            {error}
          </p>
        ) : null}

        {/* Bottom Section: Collaboration or Status History */}
        {task && selectedProjectId ? (
          <div className="ui-next-notion-task__collaboration">
            <div className="ui-next-tab-nav" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={bottomTab === "comments"}
                className={`ui-next-tab-btn ${bottomTab === "comments" ? "ui-next-tab-btn--active" : ""}`}
                onClick={() => setBottomTab("comments")}
              >
                {translate(locale, "collaboration.title")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={bottomTab === "history"}
                className={`ui-next-tab-btn ${bottomTab === "history" ? "ui-next-tab-btn--active" : ""}`}
                onClick={() => setBottomTab("history")}
              >
                {translate(locale, "tasks.history.title")} ({history.length})
              </button>
            </div>

            {bottomTab === "comments" ? (
              <CollaborationSection
                locale={locale}
                members={assignees.map((a) => ({ id: a.id, displayName: a.displayName }))}
                commentsUrl={`/api/app/projects/${encodeURIComponent(selectedProjectId)}/tasks/${encodeURIComponent(task.id)}/comments`}
                presenceUrl={`/api/app/projects/${encodeURIComponent(selectedProjectId)}/tasks/${encodeURIComponent(task.id)}/presence`}
              />
            ) : (
              <div className="ui-next-task-history">
                {historyLoading ? (
                  <p className="ui-next-task-history__empty">{translate(locale, "common.loading")}</p>
                ) : history.length === 0 ? (
                  <p className="ui-next-task-history__empty">{translate(locale, "tasks.history.empty")}</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="ui-next-task-history__item">
                      <div className="ui-next-task-history__dot" />
                      <div className="ui-next-task-history__content">
                        <div className="ui-next-task-history__header">
                          <span className="ui-next-task-history__actor">
                            {item.changedByName || (locale === "vi" ? "Không xác định" : "Unknown")}
                          </span>
                          <span>
                            {item.fromState
                              ? `${translate(locale, "tasks.history.moved")} `
                              : `${translate(locale, "tasks.history.created")} `}
                          </span>
                          <StatusBadge
                            tone={
                              item.toState === "done"
                                ? "success"
                                : item.toState === "doing"
                                  ? "information"
                                  : "neutral"
                            }
                          >
                            {translate(locale, ("tasks.state." + (item.toState || "todo")) as any)}
                          </StatusBadge>
                          <span className="ui-next-task-history__time">
                            • {formatUiDate(item.createdAt, locale, { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        {item.notes ? (
                          <div className="ui-next-task-history__note">{item.notes}</div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}

function toIso(value: string | null | undefined): string | null {
  return value && value.trim() ? new Date(value).toISOString() : null;
}

function toLocalDateTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
