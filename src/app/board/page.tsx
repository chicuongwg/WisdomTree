import { redirect } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listBoard } from "@/modules/pm/service";
import { listMentionableUsers } from "@/modules/notify/service";
import { T, taskLabel } from "@/lib/vi";
import { TaskCreateForm, TaskStateButtons } from "@/app/components/board-actions";
import { Empty } from "@/app/components/empty";

// Screen: Board (`/board`) — operational task lanes todo/doing/done
// (admin-op-screen-specs.md § Board; openapi: Editor, Admin/Op).

// What a lane says when it holds nothing. Only "Cần làm" invites work: an empty
// "Hoàn thành" is a fact about the past, not a thing to act on.
// TODO(vi): move to src/lib/vi.ts
const LANE_EMPTY: Record<string, { title: string; hint?: string }> = {
  todo: { title: "Chưa có việc cần làm.", hint: "Mở “Thêm công việc” ở trên." },
  doing: { title: "Chưa có việc đang làm." },
  done: { title: "Chưa có việc nào hoàn thành." },
};

export default async function BoardPage() {
  const user = await requireUser();
  if (user.role === "user") redirect("/");
  const actor = toPrincipal(user);
  const [tasks, members] = await Promise.all([listBoard(actor), listMentionableUsers()]);
  const lanes = ["todo", "doing", "done"] as const;

  return (
    <main className="page">
      <h1>{T.board}</h1>
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
                    <TaskStateButtons taskId={t.id} state={t.state} version={t.version} />
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
