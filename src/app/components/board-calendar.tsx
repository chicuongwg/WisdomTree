import { Fragment } from "react";
import Link from "next/link";
import { badgeClass, T, taskLabel, taskStateLabel, weekdayShort } from "@/lib/vi";
import { fromAppClock, toAppClock } from "@/lib/time";
import { Empty } from "@/app/components/empty";

// The board's two calendar shapes — a month grid and a week grid — over the
// same listSchedule() payload. Server-rendered: navigation is links, not state,
// so a month is a URL a reader can keep.
//
// Every date here is the APP's wall clock — see src/lib/time.ts for why the
// app pins one display zone rather than using the reader's.
//
// This used to say "server-local time", which is the same thing only when the
// server happens to be set to Vietnam. In a UTC container it is seven hours
// out, and seven hours is enough to file a task due at 03:00 under the
// previous day and to ring "hôm nay" around the wrong square. So everything
// entering the grid is shifted once with toAppClock() and read with the UTC
// getters: the same arithmetic as before, with the zone pinned.

export type Schedule = {
  tasks: {
    id: string;
    title: string;
    state: string;
    assigneeName: string | null;
    dueAt: Date | null;
  }[];
  deadlines: { id: string; title: string; dueAt: Date; type: string }[];
};

// --- date arithmetic (local midnight, so a cell is a day, not 24 hours) ---

// A "grid date" below is an app-clock date: the instant shifted so the UTC
// getters spell out the app's wall clock. Raw instants are converted at the
// edges and never mixed in here.
const startOfDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
/** Monday of the week holding `d`. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getUTCDay() + 6) % 7));
const sameDay = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

export const ymOf = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const ymdOf = (d: Date) => `${ymOf(d)}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** `?m=YYYY-MM` → the first of that month; anything else → this month. */
export function monthAnchor(m: string | undefined, now: Date): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(m ?? "");
  const month = match ? Number(match[2]) : 0;
  const here = toAppClock(now);
  if (!match || month < 1 || month > 12)
    return new Date(Date.UTC(here.getUTCFullYear(), here.getUTCMonth(), 1));
  return new Date(Date.UTC(Number(match[1]), month - 1, 1));
}

/** `?w=YYYY-MM-DD` → the Monday of that week; anything else → this week. */
export function weekAnchor(w: string | undefined, now: Date): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w ?? "");
  if (!match) return startOfWeek(toAppClock(now));
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(d.getTime()) ? startOfWeek(toAppClock(now)) : startOfWeek(d);
}

/* The two ranges below leave app-clock space: they are handed to the database,
   which stores real instants, so the grid's midnights are converted back to
   the moments they actually are. Without this the window would be seven hours
   off and the first and last cells of every grid would quietly lose work. */

/** Six whole Mon–Sun weeks around a month: a grid that never changes height. */
export function monthGridRange(anchor: Date) {
  const from = startOfWeek(anchor);
  return { from: fromAppClock(from), to: fromAppClock(addDays(from, 42)) };
}

export function weekGridRange(anchor: Date) {
  return { from: fromAppClock(anchor), to: fromAppClock(addDays(anchor, 7)) };
}

// --- chips ---

/** Where a chip goes when the reader opens it — the board, with this task shown. */
export type TaskHref = (taskId: string) => string;

/** A day's worth of chips: tasks first, then the deadlines they answer to. */
function DayChips({
  schedule,
  day,
  taskHref,
}: {
  schedule: Schedule;
  day: Date;
  taskHref: TaskHref;
}) {
  const tasks = schedule.tasks.filter(
    (t) => t.dueAt && sameDay(toAppClock(new Date(t.dueAt)), day),
  );
  const deadlines = schedule.deadlines.filter((d) => sameDay(toAppClock(new Date(d.dueAt)), day));
  return (
    <>
      {tasks.map((t) => (
        <TaskChip key={t.id} task={t} taskHref={taskHref} />
      ))}
      {deadlines.map((d) => (
        <DeadlineChip key={d.id} deadline={d} />
      ))}
    </>
  );
}

function TaskChip({ task, taskHref }: { task: Schedule["tasks"][number]; taskHref: TaskHref }) {
  // The holder as one letter: a full name in a 60px cell wraps to four lines
  // and buries the title. The full name stays in the tooltip.
  const initial = task.assigneeName?.trim().split(/\s+/).slice(-1)[0]?.[0] ?? "·";
  return (
    // A real link, not a click handler on a span: a chip in a calendar is the
    // thing a reader middle-clicks into a second tab, or copies the address of
    // to paste into a message. Both are free here and impossible otherwise.
    <Link
      href={taskHref(task.id)}
      className={`${badgeClass(taskStateLabel, task.state)} cal-chip`}
      title={`${task.title} — ${task.assigneeName ?? T.noAssignee}`}
      /* The chip's state rides on the badge tone, and its holder on a single
         initial — neither of which a screen reader can make anything of. Said
         in full here, so the name is the whole row: what it is, what state it
         is in, whose it is. */
      aria-label={`${T.taskType}: ${task.title} — ${taskLabel(task.state)} — ${
        task.assigneeName ?? T.noAssignee
      }`}
    >
      <span className="cal-chip-text">{task.title}</span>
      <span className="cal-chip-who">{initial}</span>
    </Link>
  );
}

function DeadlineChip({ deadline }: { deadline: Schedule["deadlines"][number] }) {
  // Deadlines are not tasks and must not read as one: a left bar and the flag
  // mark carry it for the eye. Neither reaches a screen reader — the flag is
  // aria-hidden, as a decorative glyph should be — so the word "Hạn chót"
  // carries it there, or a deadline and a task announce identically.
  return (
    <span
      className="badge cal-chip cal-chip-deadline"
      title={deadline.title}
      aria-label={`${T.deadline}: ${deadline.title}`}
    >
      <span aria-hidden="true">⚑</span>
      <span className="cal-chip-text">{deadline.title}</span>
    </span>
  );
}

const isEmpty = (s: Schedule) => s.tasks.length === 0 && s.deadlines.length === 0;

// --- month ---

export function MonthView({
  anchor,
  schedule,
  now,
  taskHref,
}: {
  anchor: Date;
  schedule: Schedule;
  now: Date;
  taskHref: TaskHref;
}) {
  // startOfWeek, not monthGridRange: that one converts out of app-clock space
  // for the database, and these 42 cells are still being counted in it.
  const from = startOfWeek(anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const prev = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
  const next = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));

  return (
    <section className="panel">
      <div className="cal-head">
        <h2>
          {T.boardViewMonth} {anchor.getUTCMonth() + 1}/{anchor.getUTCFullYear()}
        </h2>
        <div className="cal-nav">
          <Link href={`/board?view=month&m=${ymOf(prev)}`}>← {T.prevMonth}</Link>
          <Link href="/board?view=month">{T.today}</Link>
          <Link href={`/board?view=month&m=${ymOf(next)}`}>{T.nextMonth} →</Link>
        </div>
      </div>
      {isEmpty(schedule) ? (
        <Empty panel={false} title={T.calendarEmptyTitle} hint={T.calendarEmptyHint} />
      ) : null}
      <div className="record-scroll">
        <div className="cal-month">
          {weekdayShort.map((w) => (
            <div key={w} className="cal-dow">
              {w}
            </div>
          ))}
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={`cal-day${sameDay(d, toAppClock(now)) ? " is-today" : ""}${
                d.getUTCMonth() === anchor.getUTCMonth() ? "" : " is-outside"
              }`}
            >
              <div className="cal-daynum">{d.getUTCDate()}</div>
              <DayChips schedule={schedule} day={d} taskHref={taskHref} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- week ---

// ponytail: 6:00–22:00, not a full 24 rows. The data is office work — a
// midnight-to-six band would be a third of the grid's height showing nothing.
// Anything outside the band lands in the strip at the top rather than being
// dropped, so nothing is ever invisible.
const HOUR_FROM = 6;
const HOUR_TO = 22;

export function WeekView({
  anchor,
  schedule,
  now,
  taskHref,
}: {
  anchor: Date;
  schedule: Schedule;
  now: Date;
  taskHref: TaskHref;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const hours = Array.from({ length: HOUR_TO - HOUR_FROM }, (_, i) => HOUR_FROM + i);
  const inBand = (d: Date) => d.getUTCHours() >= HOUR_FROM && d.getUTCHours() < HOUR_TO;

  /** The chips for one column, either inside an hour row or in the strip. */
  function cell(day: Date, hour: number | null) {
    const hit = (raw: Date) => {
      const d = toAppClock(new Date(raw));
      if (!sameDay(d, day)) return false;
      return hour === null ? !inBand(d) : d.getUTCHours() === hour;
    };
    const tasks = schedule.tasks.filter((t) => t.dueAt && hit(t.dueAt));
    const deadlines = schedule.deadlines.filter((d) => hit(d.dueAt));
    return (
      <>
        {tasks.map((t) => (
          <TaskChip key={t.id} task={t} taskHref={taskHref} />
        ))}
        {deadlines.map((d) => (
          <DeadlineChip key={d.id} deadline={d} />
        ))}
      </>
    );
  }

  return (
    <section className="panel">
      <div className="cal-head">
        <h2>
          {T.boardViewWeek} {ymdOf(anchor)}
        </h2>
        <div className="cal-nav">
          <Link href={`/board?view=week&w=${ymdOf(addDays(anchor, -7))}`}>← {T.prevWeek}</Link>
          <Link href="/board?view=week">{T.today}</Link>
          <Link href={`/board?view=week&w=${ymdOf(addDays(anchor, 7))}`}>{T.nextWeek} →</Link>
        </div>
      </div>
      {isEmpty(schedule) ? (
        <Empty panel={false} title={T.calendarEmptyTitle} hint={T.calendarEmptyHint} />
      ) : null}
      <div className="record-scroll">
        <div className="cal-week">
          <div className="cal-corner" />
          {days.map((d, i) => (
            <div
              key={d.toISOString()}
              className={`cal-dow${sameDay(d, toAppClock(now)) ? " is-today" : ""}`}
            >
              {weekdayShort[i]} {d.getUTCDate()}/{d.getUTCMonth() + 1}
            </div>
          ))}
          <div className="cal-hour cal-hour-allday">{T.outsideHoursStrip}</div>
          {days.map((d) => (
            <div
              key={`all-${d.toISOString()}`}
              className={`cal-slot cal-slot-allday${sameDay(d, toAppClock(now)) ? " is-today" : ""}`}
            >
              {cell(d, null)}
            </div>
          ))}
          {hours.map((h) => (
            // One flat grid: hour label and its seven slots are siblings, so
            // every row lines up on the same eight columns.
            <Fragment key={`row-${h}`}>
              <div className="cal-hour">{String(h).padStart(2, "0")}:00</div>
              {days.map((d) => (
                <div
                  key={`${h}-${d.toISOString()}`}
                  className={`cal-slot${sameDay(d, toAppClock(now)) ? " is-today" : ""}`}
                >
                  {cell(d, h)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
