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
          className="grid w-full gap-0.5 rounded px-2 py-1 bg-ui-information-bg text-ui-information no-underline text-start break-words hover:opacity-90"
        >
          <span className="line-clamp-2 text-xs font-semibold">{task.title}</span>
          <small className="line-clamp-2 text-[0.65rem] opacity-85">
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
        <Link
          href={`/app/calendar/deadlines/${encodeURIComponent(deadline.id)}`}
          className="grid w-full gap-0.5 rounded px-2 py-1 bg-ui-warning-bg text-ui-warning no-underline text-start break-words hover:opacity-90"
        >
          <span className="line-clamp-2 text-xs font-semibold">{deadline.title}</span>
          <small className="line-clamp-2 text-[0.65rem] opacity-85">
            {translate(locale, `calendar.type.${deadline.type}`)} · {deadline.projectName}
          </small>
        </Link>
        {projects.some(
          (project) => project.id === deadline.projectId && project.canEditDeadline,
        ) ? (
          <button
            type="button"
            className="text-xs text-ui-text-muted hover:text-ui-text underline mt-0.5 text-start cursor-pointer"
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
    <section className="ui-next-calendar grid gap-6" aria-labelledby="calendar-title">
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
      <div className="ui-next-calendar__controls flex flex-wrap items-end justify-between gap-3 max-sm:flex-col max-sm:items-start">
        <nav
          aria-label={translate(locale, "calendar.views")}
          className="flex items-center gap-3 font-semibold text-sm"
        >
          <Link
            href={`/app/calendar?${new URLSearchParams(selectedProjectId ? { projectId: selectedProjectId } : {}).toString()}`}
            className="text-ui-accent underline-offset-[0.18em] aria-current:text-ui-text aria-current:underline"
            aria-current={view === "month" ? "page" : undefined}
          >
            {translate(locale, "calendar.month")}
          </Link>
          <Link
            href={`/app/calendar?view=week${selectedProjectId ? `&projectId=${encodeURIComponent(selectedProjectId)}` : ""}`}
            className="text-ui-accent underline-offset-[0.18em] aria-current:text-ui-text aria-current:underline"
            aria-current={view === "week" ? "page" : undefined}
          >
            {translate(locale, "calendar.week")}
          </Link>
        </nav>
        <form
          method="get"
          className="ui-next-inline ui-next-calendar__filter flex flex-wrap items-center gap-3"
        >
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
          <label className="grid gap-1 text-ui-text-secondary text-sm font-semibold">
            <span>{translate(locale, "calendar.filterProject")}</span>
            <select
              className="ui-next-control min-w-[14rem] max-sm:min-w-full"
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
      <section
        className="ui-next-calendar__frame min-w-0 overflow-x-auto border border-ui-border rounded-lg bg-ui-surface p-4"
        aria-label={monthLabel(locale, year, month)}
      >
        <header className="ui-next-calendar__heading flex items-center justify-between gap-3 mb-4 max-sm:flex-col max-sm:items-start">
          <h2 className="m-0 text-lg font-bold">{monthLabel(locale, year, month)}</h2>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link
              href={
                view === "week"
                  ? setWeek(new Date(Date.UTC(year, month, weekDay - 7)))
                  : setMonth(new Date(Date.UTC(year, month - 1, 1)))
              }
              className="text-ui-accent underline-offset-[0.18em] hover:underline"
            >
              {translate(locale, "calendar.previous")}
            </Link>
            <Link
              href={`/app/calendar?${base}`}
              className="text-ui-accent underline-offset-[0.18em] hover:underline"
            >
              {translate(locale, "calendar.today")}
            </Link>
            <Link
              href={
                view === "week"
                  ? setWeek(new Date(Date.UTC(year, month, weekDay + 7)))
                  : setMonth(new Date(Date.UTC(year, month + 1, 1)))
              }
              className="text-ui-accent underline-offset-[0.18em] hover:underline"
            >
              {translate(locale, "calendar.next")}
            </Link>
          </div>
        </header>
        <div
          className={
            view === "week"
              ? "ui-next-calendar__grid ui-next-calendar__grid--week grid grid-cols-7 min-w-[63rem] max-sm:min-w-[31.5rem] overflow-hidden border-t border-l border-ui-border min-h-[25rem]"
              : "ui-next-calendar__grid grid grid-cols-7 min-w-[63rem] max-sm:min-w-[31.5rem] overflow-hidden border-t border-l border-ui-border"
          }
        >
          {weekdayLabels.map((label) => (
            <div
              className="ui-next-calendar__weekday bg-ui-surface-sunken text-ui-text-secondary text-sm font-bold p-2.5 border-b border-r border-ui-border"
              key={label}
            >
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
                className={`ui-next-calendar__day grid content-start gap-2 min-h-[9rem] p-2 border-b border-r border-ui-border${day.getUTCMonth() === month || view === "week" ? "" : " ui-next-calendar__day--outside bg-ui-surface-sunken/60 text-ui-text-muted"}${key === nowKey ? " ui-next-calendar__day--today ring-2 ring-inset ring-ui-focus" : ""}`}
                key={key}
              >
                <header className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-sm">{day.getUTCDate()}</span>
                  {dayTasks.length ? (
                    <small className="text-xs text-ui-text-muted">
                      {translate(locale, "calendar.workload", { count: dayTasks.length })}
                    </small>
                  ) : null}
                </header>
                {overdue ? (
                  <strong className="ui-next-calendar__overdue text-xs text-ui-danger font-semibold">
                    {translate(locale, "calendar.overdue")}
                  </strong>
                ) : null}
                <ul role="list" className="grid gap-1 m-0 p-0 list-none">
                  {entries.slice(0, previewCount).map((entry) => entry.content)}
                </ul>
                {entries.length > previewCount ? (
                  <details className="ui-next-calendar__overflow">
                    <summary className="list-item min-h-[2.75rem] py-2 text-ui-accent text-sm cursor-pointer">
                      {translate(locale, "calendar.moreEntries", {
                        count: entries.length - previewCount,
                      })}
                    </summary>
                    <ul role="list" className="grid gap-1 m-0 p-0 list-none">
                      {entries.slice(previewCount).map((entry) => entry.content)}
                    </ul>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
        {!tasks.length && !deadlines.length ? (
          <p className="ui-next-calendar__empty mt-4 m-0 text-ui-text-secondary text-sm">
            {translate(locale, "calendar.noEntries")}
          </p>
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
