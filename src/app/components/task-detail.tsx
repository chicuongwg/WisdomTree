import Link from "next/link";
import type { Principal } from "@/modules/auth/dev-auth";
import type { getTask } from "@/modules/pm/service";
import { authorize } from "@/modules/auth/authorize";
import {
  badgeClass,
  day,
  spanLabel,
  T,
  taskLabel,
  taskStateLabel,
  untilLabel,
  when,
} from "@/lib/vi";
import { TaskDetailForm } from "@/app/components/board-actions";

// One task, read in full — the body shared by the side panel on /board and the
// full page at /board/task/:id. Both shapes show the same thing on purpose:
// the toggle between them is about how much of the screen the task gets, never
// about what the reader is allowed to learn.

export type TaskDetailData = Awaited<ReturnType<typeof getTask>>;

/**
 * May this reader edit the task? Asked of the real policy rather than
 * re-stated here: `authorize` throws, so a try/catch is the honest way to turn
 * "would this be allowed" into a boolean. The service still enforces it on the
 * save — this only decides whether to offer a form that would be refused.
 */
function mayManage(actor: Principal, task: TaskDetailData): boolean {
  try {
    authorize(actor, "pm.board.manage", {
      ownerIds: [task.createdBy, task.assignedTo],
      kind: "write",
    });
    return true;
  } catch {
    return false;
  }
}

export function TaskDetail({
  task,
  actor,
  now,
  variant,
  closeHref,
}: {
  task: TaskDetailData;
  actor: Principal;
  now: Date;
  /** "panel" sits beside the board; "page" owns the screen. */
  variant: "panel" | "page";
  /** Where the panel's close control goes — the board, in the view it was opened from. */
  closeHref: string;
}) {
  const canManage = mayManage(actor, task);
  const span = task.startAt && task.dueAt ? spanLabel(task.startAt, task.dueAt) : null;
  const until = task.dueAt ? untilLabel(new Date(task.dueAt), now) : null;

  return (
    <article className="task-detail">
      <div className="task-detail-head">
        <span className={badgeClass(taskStateLabel, task.state)}>{taskLabel(task.state)}</span>
        <div className="task-detail-nav">
          {variant === "panel" ? (
            <>
              <Link href={`/board/task/${task.id}`}>{T.openFullPage}</Link>
              <Link href={closeHref}>{T.closeTaskPanel}</Link>
            </>
          ) : (
            <Link href={closeHref}>← {T.backToBoard}</Link>
          )}
        </div>
      </div>

      {/* The panel lives inside a page that already has an <h1>, so its title is
          an <h2>; the full page owns the heading level. */}
      {variant === "page" ? <h1>{task.title}</h1> : <h2>{task.title}</h2>}

      <dl className="task-facts">
        <div>
          <dt>{T.assignee}</dt>
          <dd>{task.assigneeName ?? T.noAssignee}</dd>
        </div>
        {/* Duration first: a workload board is read for how much room the work
            has, and the deadline alone never answered that. */}
        {span && (
          <div>
            <dt>{T.taskDurationLabel}</dt>
            <dd>{span}</dd>
          </div>
        )}
        {task.startAt && (
          <div>
            <dt>{T.startAtLabel}</dt>
            <dd>{day(task.startAt)}</dd>
          </div>
        )}
        <div>
          <dt>{T.dueAtLabel}</dt>
          <dd>
            {task.dueAt ? day(task.dueAt) : T.notYet}
            {until && <> · {until}</>}
          </dd>
        </div>
        <div>
          <dt>{T.createdAtLabel}</dt>
          <dd>{when(task.createdAt)}</dd>
        </div>
        <div>
          <dt>{T.updatedAtLabel}</dt>
          <dd>{when(task.updatedAt)}</dd>
        </div>
      </dl>

      <section>
        <h3>{T.taskNotes}</h3>
        {canManage ? (
          <TaskDetailForm
            task={{
              id: task.id,
              // Dates cross into a client component, so they cross as ISO text
              // and are turned back into local wall-clock inside the form.
              startAt: task.startAt ? task.startAt.toISOString() : null,
              dueAt: task.dueAt ? task.dueAt.toISOString() : null,
              notes: task.notes,
              version: task.version,
            }}
          />
        ) : (
          <>
            {/* Plain text, deliberately: `white-space: pre-wrap` keeps the
                paragraphs a person typed without any markup to learn. */}
            <p className="task-notes-read">{task.notes || T.taskNotesEmpty}</p>
            <p className="muted">{T.taskNotManageable}</p>
          </>
        )}
      </section>
    </article>
  );
}
