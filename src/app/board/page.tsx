import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listBoard, listSchedule } from "@/modules/pm/service";
import { listMentionableUsers } from "@/modules/notify/service";
import { T, day, taskLabel, untilLabel } from "@/lib/vi";
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
  searchParams: Promise<{ view?: string; m?: string; w?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { view, m, w } = await searchParams;
  const mode = view === "month" || view === "week" ? view : "kanban";
  // One "now" for the whole page, so the range and the "today" cell cannot
  // disagree about which day it is.
  const now = new Date();
  const anchor = mode === "week" ? weekAnchor(w, now) : monthAnchor(m, now);
  const range = mode === "week" ? weekGridRange(anchor) : monthGridRange(anchor);

  const [tasks, members, schedule] = await Promise.all([
    mode === "kanban" ? listBoard(actor) : [],
    listMentionableUsers(),
    mode === "kanban" ? null : listSchedule(actor, range),
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

      {mode === "month" && schedule && <MonthView anchor={anchor} schedule={schedule} now={now} />}
      {mode === "week" && schedule && <WeekView anchor={anchor} schedule={schedule} now={now} />}
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
                    <div key={t.id} className="board-card">
                      <div>{t.title}</div>
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
    </main>
  );
}
