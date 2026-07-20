import { redirect } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listBoard } from "@/modules/pm/service";
import { listMentionableUsers } from "@/modules/notify/service";
import { T, taskStateLabel } from "@/lib/vi";
import { TaskCreateForm, TaskStateButtons } from "@/app/components/board-actions";

// Screen: Board (`/board`) — operational task lanes todo/doing/done
// (admin-op-screen-specs.md § Board; openapi: Editor, Admin/Op).
export default async function BoardPage() {
  const user = await requireUser();
  if (user.role === "user") redirect("/");
  const actor = toPrincipal(user);
  const [tasks, members] = await Promise.all([listBoard(actor), listMentionableUsers()]);
  const lanes = ["todo", "doing", "done"] as const;

  return (
    <main className="page">
      <h1>{T.board}</h1>
      <div className="with-side">
        <div className="board-columns">
          {lanes.map((lane) => {
            const laneTasks = tasks.filter((t) => t.state === lane);
            return (
              <section key={lane} className="panel" aria-label={taskStateLabel[lane]}>
                <h2>
                  {taskStateLabel[lane]} <span className="badge muted">{laneTasks.length}</span>
                </h2>
                {laneTasks.length === 0 ? (
                  <p className="muted">{T.empty}</p>
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
        <aside>
          <div className="panel">
            <h2>{T.createTask}</h2>
            <TaskCreateForm assignees={members} />
          </div>
        </aside>
      </div>
    </main>
  );
}
