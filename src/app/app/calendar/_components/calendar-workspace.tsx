"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fromAppInput, toAppClock, toAppInput } from "@/lib/time";
import type { UiLocale } from "@/modules/auth/profile";
import { Button, Dialog, PageHeader, Select, TextField, translate } from "@/app/components/ui-next";

type Project = { id: string; name: string; isPersonal: boolean; canEditDeadline: boolean };
type Task = {
  id: string;
  projectId: string;
  projectName: string;
  activityId: string | null;
  activityTitle: string | null;
  title: string;
  state: "todo" | "doing" | "done" | "archived";
  assigneeName: string | null;
  dueAt: Date | string | null;
};
type Deadline = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: "conference" | "funding" | "report" | "milestone";
  dueAt: Date | string;
  version: number;
};

const DEADLINE_TYPES = ["conference", "funding", "report", "milestone"] as const;

function appDayKey(raw: Date | string) {
  const value = toAppClock(new Date(raw));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate(),
  ).padStart(2, "0")}`;
}

function keyFor(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function startMonday(date: Date) {
  const at = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(at.getTime() - ((at.getUTCDay() + 6) % 7) * 86_400_000);
}

function daysForMonth(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const firstGrid = startMonday(first);
  return Array.from(
    { length: 42 },
    (_, index) => new Date(firstGrid.getTime() + index * 86_400_000),
  );
}

function daysForWeek(year: number, month: number, day: number) {
  const first = startMonday(new Date(Date.UTC(year, month, day)));
  return Array.from({ length: 7 }, (_, index) => new Date(first.getTime() + index * 86_400_000));
}

function monthLabel(locale: UiLocale, year: number, month: number) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 1)));
}

function isoAtInput(value: FormDataEntryValue | null) {
  return typeof value === "string" && value ? fromAppInput(value).toISOString() : null;
}

export function CalendarWorkspace({
  locale,
  projects,
  tasks,
  deadlines,
  year,
  month,
  weekDay,
  view,
  selectedProjectId,
}: {
  locale: UiLocale;
  projects: Project[];
  tasks: Task[];
  deadlines: Deadline[];
  year: number;
  month: number;
  weekDay: number;
  view: "month" | "week";
  selectedProjectId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editableProjects = projects.filter((project) => project.canEditDeadline);
  const weekdayLabels =
    locale === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const days = useMemo(
    () => (view === "week" ? daysForWeek(year, month, weekDay) : daysForMonth(year, month)),
    [year, month, weekDay, view],
  );
  const nowKey = appDayKey(new Date());
  const base = new URLSearchParams();
  base.set("view", view);
  if (selectedProjectId) base.set("projectId", selectedProjectId);
  const setMonth = (target: Date) => {
    const params = new URLSearchParams(base);
    params.set(
      "m",
      `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    return `/app/calendar?${params}`;
  };
  const setWeek = (target: Date) => {
    const params = new URLSearchParams(base);
    params.set(
      "w",
      `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`,
    );
    return `/app/calendar?${params}`;
  };

  async function saveDeadline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editing ? `/api/app/calendar/${encodeURIComponent(editing.id)}` : "/api/app/calendar",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(editing
              ? { expectedVersion: editing.version }
              : { spaceId: form.get("projectId") }),
            title: form.get("title"),
            type: form.get("type"),
            dueAt: isoAtInput(form.get("dueAt")),
          }),
        },
      );
      if (!response.ok) throw new Error("request_failed");
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch {
      setError(translate(locale, "calendar.actionFailed"));
    } finally {
      setSaving(false);
    }
  }

  function taskEntry(task: Task) {
    return (
      <li key={`task-${task.id}`}>
        <Link
          href={`/app/projects/${encodeURIComponent(task.projectId)}/tasks/${encodeURIComponent(task.id)}`}
        >
          <span>{task.title}</span>
          <small>
            {translate(locale, `tasks.state.${task.state}`)} · {task.projectName}
            {task.activityTitle ? ` · ${task.activityTitle}` : ""}
          </small>
        </Link>
      </li>
    );
  }

  function deadlineEntry(deadline: Deadline) {
    return (
      <li key={`deadline-${deadline.id}`} className="ui-next-calendar__deadline">
        <Link href={`/app/calendar/deadlines/${encodeURIComponent(deadline.id)}`}>
          <span>{deadline.title}</span>
          <small>
            {translate(locale, `calendar.type.${deadline.type}`)} · {deadline.projectName}
          </small>
        </Link>
        {projects.some(
          (project) => project.id === deadline.projectId && project.canEditDeadline,
        ) ? (
          <button
            type="button"
            onClick={() => {
              setEditing(deadline);
              setError(null);
              setOpen(true);
            }}
          >
            {translate(locale, "common.edit")}
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <section className="ui-next-calendar" aria-labelledby="calendar-title">
      <PageHeader
        titleId="calendar-title"
        title={translate(locale, "calendar.title")}
        description={translate(locale, "calendar.description")}
        actions={
          editableProjects.length ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setEditing(null);
                setError(null);
                setOpen(true);
              }}
            >
              {translate(locale, "calendar.createDeadline")}
            </Button>
          ) : null
        }
      />
      <div className="ui-next-calendar__controls">
        <nav aria-label={translate(locale, "calendar.views")}>
          <Link
            href={`/app/calendar?${new URLSearchParams(selectedProjectId ? { projectId: selectedProjectId } : {}).toString()}`}
            aria-current={view === "month" ? "page" : undefined}
          >
            {translate(locale, "calendar.month")}
          </Link>
          <Link
            href={`/app/calendar?view=week${selectedProjectId ? `&projectId=${encodeURIComponent(selectedProjectId)}` : ""}`}
            aria-current={view === "week" ? "page" : undefined}
          >
            {translate(locale, "calendar.week")}
          </Link>
        </nav>
        <form method="get" className="ui-next-inline ui-next-calendar__filter">
          <input type="hidden" name="view" value={view} />
          <input
            type="hidden"
            name={view === "week" ? "w" : "m"}
            value={
              view === "week"
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(weekDay).padStart(2, "0")}`
                : `${year}-${String(month + 1).padStart(2, "0")}`
            }
          />
          <label>
            <span>{translate(locale, "calendar.filterProject")}</span>
            <select
              className="ui-next-control"
              name="projectId"
              defaultValue={selectedProjectId ?? ""}
            >
              <option value="">{translate(locale, "calendar.allProjects")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.isPersonal ? translate(locale, "projects.myProject") : project.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            {translate(locale, "calendar.apply")}
          </Button>
        </form>
      </div>
      <section className="ui-next-calendar__frame" aria-label={monthLabel(locale, year, month)}>
        <header className="ui-next-calendar__heading">
          <h2>{monthLabel(locale, year, month)}</h2>
          <div>
            <Link
              href={
                view === "week"
                  ? setWeek(new Date(Date.UTC(year, month, weekDay - 7)))
                  : setMonth(new Date(Date.UTC(year, month - 1, 1)))
              }
            >
              {translate(locale, "calendar.previous")}
            </Link>
            <Link href={`/app/calendar?${base}`}>{translate(locale, "calendar.today")}</Link>
            <Link
              href={
                view === "week"
                  ? setWeek(new Date(Date.UTC(year, month, weekDay + 7)))
                  : setMonth(new Date(Date.UTC(year, month + 1, 1)))
              }
            >
              {translate(locale, "calendar.next")}
            </Link>
          </div>
        </header>
        <div
          className={
            view === "week"
              ? "ui-next-calendar__grid ui-next-calendar__grid--week"
              : "ui-next-calendar__grid"
          }
        >
          {weekdayLabels.map((label) => (
            <div className="ui-next-calendar__weekday" key={label}>
              {label}
            </div>
          ))}
          {days.map((day) => {
            const key = keyFor(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
            const dayTasks = tasks.filter((task) => task.dueAt && appDayKey(task.dueAt) === key);
            const dayDeadlines = deadlines.filter((deadline) => appDayKey(deadline.dueAt) === key);
            const overdue = dayTasks.some((task) => task.state !== "done" && key < nowKey);
            const entries = [
              ...dayTasks.map((task) => ({
                at: new Date(task.dueAt!).getTime(),
                content: taskEntry(task),
              })),
              ...dayDeadlines.map((deadline) => ({
                at: new Date(deadline.dueAt).getTime(),
                content: deadlineEntry(deadline),
              })),
            ].sort((left, right) => left.at - right.at);
            const previewCount = view === "week" ? 6 : 3;
            return (
              <div
                className={`ui-next-calendar__day${day.getUTCMonth() === month || view === "week" ? "" : " ui-next-calendar__day--outside"}${key === nowKey ? " ui-next-calendar__day--today" : ""}`}
                key={key}
              >
                <header>
                  <span>{day.getUTCDate()}</span>
                  {dayTasks.length ? (
                    <small>
                      {translate(locale, "calendar.workload", { count: dayTasks.length })}
                    </small>
                  ) : null}
                </header>
                {overdue ? (
                  <strong className="ui-next-calendar__overdue">
                    {translate(locale, "calendar.overdue")}
                  </strong>
                ) : null}
                <ul role="list">{entries.slice(0, previewCount).map((entry) => entry.content)}</ul>
                {entries.length > previewCount ? (
                  <details className="ui-next-calendar__overflow">
                    <summary>
                      {translate(locale, "calendar.moreEntries", {
                        count: entries.length - previewCount,
                      })}
                    </summary>
                    <ul role="list">{entries.slice(previewCount).map((entry) => entry.content)}</ul>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
        {!tasks.length && !deadlines.length ? (
          <p className="ui-next-calendar__empty">{translate(locale, "calendar.noEntries")}</p>
        ) : null}
      </section>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={translate(locale, editing ? "calendar.editDeadline" : "calendar.createDeadline")}
        closeLabel={translate(locale, "common.close")}
      >
        <form className="ui-next-work-form" onSubmit={saveDeadline}>
          {!editing ? (
            <Select
              id="calendar-deadline-project"
              name="projectId"
              label={translate(locale, "calendar.deadlineProject")}
              required
              defaultValue={
                selectedProjectId &&
                editableProjects.some((project) => project.id === selectedProjectId)
                  ? selectedProjectId
                  : ""
              }
            >
              <option value="" disabled>
                —
              </option>
              {editableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.isPersonal ? translate(locale, "projects.myProject") : project.name}
                </option>
              ))}
            </Select>
          ) : null}
          <TextField
            id="calendar-deadline-title"
            name="title"
            label={translate(locale, "calendar.deadlineTitle")}
            required
            defaultValue={editing?.title ?? ""}
          />
          <Select
            id="calendar-deadline-type"
            name="type"
            label={translate(locale, "calendar.deadlineType")}
            defaultValue={editing?.type ?? "milestone"}
          >
            {DEADLINE_TYPES.map((type) => (
              <option key={type} value={type}>
                {translate(locale, `calendar.type.${type}`)}
              </option>
            ))}
          </Select>
          <TextField
            id="calendar-deadline-due"
            name="dueAt"
            type="datetime-local"
            label={translate(locale, "tasks.field.dueAt")}
            required
            defaultValue={toAppInput(editing?.dueAt ?? null)}
          />
          {error ? (
            <p className="ui-next-work-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="ui-next-work-form__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
