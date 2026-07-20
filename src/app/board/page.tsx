import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getTask, listBoard, listSchedule } from "@/modules/pm/service";
import { listMentionableUsers } from "@/modules/notify/service";
import { T, day, spanLabel, taskLabel, untilLabel } from "@/lib/vi";
import { TaskDetail } from "@/app/components/task-detail";
import {
  MonthView,
  WeekView,
  monthAnchor,
  monthGridRange,
  weekAnchor,
  weekGridRange,
} from "@/app/components/board-calendar";
import {
  TaskArchiveButton,
  TaskClaimButton,
  TaskCreateForm,
  TaskStateButtons,
} from "@/app/components/board-actions";
import { Empty } from "@/app/components/empty";

// Screen: Board (`/board`) — the same work in three shapes, chosen by `?view=`:
// today's lanes (default), a month, a week. Open to every role: pm.board.read
// carries no space scope, and a shared pool nobody can see is not a pool.

// What a lane says when it holds nothing. Only "Cần làm" invites work: an empty
// "Hoàn thành" is a fact about the past, not a thing to act on.
const LANE_EMPTY: Record<string, { title: string; hint?: string }> = {
  todo: { title: T.boardTodoEmptyTitle, hint: T.boardTodoEmptyHint },
  doing: { title: T.boardDoingEmptyTitle },
  done: { title: T.boardDoneEmptyTitle },
};

const VIEWS = [
  { key: "kanban", label: T.boardViewKanban, href: "/board" },
  { key: "month", label: T.boardViewMonth, href: "/board?view=month" },
  { key: "week", label: T.boardViewWeek, href: "/board?view=week" },
] as const;

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; m?: string; w?: string; task?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { view, m, w, task: rawTask } = await searchParams;
  const mode = view === "month" || view === "week" ? view : "kanban";
  // `?task=` comes off a URL a person can edit, and a value that is not an id
  // shape reaches Postgres as a malformed uuid and takes the WHOLE board down
  // with a 500. Anything that is not an id is simply no task at all; a
  // well-formed id that no longer exists still 404s, which is the honest
  // answer to a shared link for a task that is gone.
  const openTaskId = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(rawTask ?? "")
    ? rawTask
    : undefined;
  // One "now" for the whole page, so the range and the "today" cell cannot
  // disagree about which day it is.
  const now = new Date();
  const anchor = mode === "week" ? weekAnchor(w, now) : monthAnchor(m, now);
  const range = mode === "week" ? weekGridRange(anchor) : monthGridRange(anchor);

  // The view a link must come back to. Everything except `?task=` — which is
  // exactly what the panel's close control needs, and what a chip's link adds
  // one key to. Kept as one URLSearchParams so a future `?q=` rides along
  // without every link having to learn about it.
  const viewParams = new URLSearchParams();
  if (mode !== "kanban") viewParams.set("view", mode);
  if (m) viewParams.set("m", m);
  if (w) viewParams.set("w", w);
  const query = viewParams.toString();
  const boardHref = query ? `/board?${query}` : "/board";
  const taskHref = (id: string) => {
    const p = new URLSearchParams(viewParams);
    p.set("task", id);
    return `/board?${p}`;
  };

  const [tasks, members, schedule, openTask] = await Promise.all([
    mode === "kanban" ? listBoard(actor) : [],
    listMentionableUsers(),
    mode === "kanban" ? null : listSchedule(actor, range),
    // A pasted link to a task that no longer exists should say so, so a 404
    // from the service becomes the app's 404 rather than a board with a
    // silently missing panel.
    openTaskId ? orNotFound(() => getTask(actor, openTaskId)) : null,
  ]);
  const lanes = ["todo", "doing", "done"] as const;

  return (
    <main className="page">
      <h1>{T.board}</h1>
      <nav className="segmented" aria-label={T.boardViews}>
        {VIEWS.map((v) => (
          <Link key={v.key} href={v.href} aria-current={mode === v.key ? "page" : undefined}>
            {v.label}
          </Link>
        ))}
      </nav>
      {/* The create form used to hold a permanent 19rem rail, which left the
          three lanes about 230px each — a quarter of the work surface spent on
          a form nobody has open most of the time. A disclosure gives it back;
          .graph-panel is the app's own disclosure look.
          ponytail: no `open` prop, deliberately. Deriving it from the board
          (open when empty) means the refresh after the first task flips it back
          to closed under the reader's cursor, taking focus with it. */}
      <details className="graph-panel">
        <summary>{T.createTask}</summary>
        <div className="graph-panel-body">
          <TaskCreateForm assignees={members} />
        </div>
      </details>

      {/* The detail rides beside whichever view is on, because `?task=` is
          independent of `?view=`: opening a task must never throw the reader
          back to the lanes when they were reading a month. */}
      <div className={openTask ? "board-with-panel" : undefined}>
        <div className="board-surface">
          {mode === "month" && schedule && (
            <MonthView anchor={anchor} schedule={schedule} now={now} taskHref={taskHref} />
          )}
          {mode === "week" && schedule && (
            <WeekView anchor={anchor} schedule={schedule} now={now} taskHref={taskHref} />
          )}
          {mode === "kanban" && (
            <div className="board-columns">
              {lanes.map((lane) => {
                const laneTasks = tasks.filter((t) => t.state === lane);
                return (
                  <section key={lane} className="panel" aria-label={taskLabel(lane)}>
                    <h2>
                      {taskLabel(lane)}{" "}
                      {/* A count is not a state: "Hoàn thành 0" wore the green done
                          ring for having nothing in it. Neutral chip, per vi.ts. */}
                      <span className="badge muted">{laneTasks.length}</span>
                    </h2>
                    {laneTasks.length === 0 ? (
                      <Empty panel={false} {...LANE_EMPTY[lane]} />
                    ) : (
                      laneTasks.map((t) => (
                        <div
                          key={t.id}
                          className={`board-card${openTaskId === t.id ? " is-open" : ""}`}
                        >
                          {/* The title is the link, and it is a real <Link>: the
                              whole card cannot be one without swallowing the
                              buttons inside it. */}
                          <Link href={taskHref(t.id)} className="board-card-title">
                            {t.title}
                          </Link>
                          <div className="meta">
                            {T.assignee}: {t.assigneeName ?? T.noAssignee}
                          </div>
                          {/* A card that cannot show its own deadline sends the
                              reader to the calendar to learn what it already knows. */}
                          {t.dueAt && (
                            <div className="meta">
                              {T.dueAtLabel}: {day(t.dueAt)}
                              {untilLabel(new Date(t.dueAt), now) && (
                                <> · {untilLabel(new Date(t.dueAt), now)}</>
                              )}
                            </div>
                          )}
                          {/* The span, when there is one — the owner's "thời gian
                              cho phép". A deadline says when to stop; only the span
                              says how much room the work has, which is the question
                              a workload board exists to answer. */}
                          {t.startAt && t.dueAt && spanLabel(t.startAt, t.dueAt) && (
                            <div className="meta">
                              {T.taskDurationLabel}: {spanLabel(t.startAt, t.dueAt)} ({day(t.startAt)}{" "}
                              – {day(t.dueAt)})
                            </div>
                          )}
                          <TaskStateButtons taskId={t.id} state={t.state} version={t.version} />
                          <div className="board-actions">
                            {/* Unheld work is the shared pool: anyone may take it. */}
                            {t.assignedTo === null && <TaskClaimButton taskId={t.id} />}
                            <TaskArchiveButton taskId={t.id} />
                          </div>
                        </div>
                      ))
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
        {openTask && (
          <aside className="panel task-panel" aria-label={T.taskDetail}>
            <TaskDetail
              task={openTask}
              actor={actor}
              now={now}
              variant="panel"
              closeHref={boardHref}
            />
          </aside>
        )}
      </div>
    </main>
  );
}
