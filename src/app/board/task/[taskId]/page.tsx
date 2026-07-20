import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getTask } from "@/modules/pm/service";
import { TaskDetail } from "@/app/components/task-detail";

// Screen: Task Detail (`/board/task/:id`) — the full-page half of the pair the
// owner asked for ("side page or fullpage with toggle"). Same body as the panel
// on /board, given the whole column: a long note is written here, not in a
// 24rem strip beside three lanes.
export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { taskId } = await params;
  const task = await orNotFound(() => getTask(actor, taskId));

  return (
    <main className="page">
      {/* ponytail: back always goes to the plain board, not to the view the
          reader came from. Carrying `?view=` through a full-page navigation
          would mean threading it into every link that reaches this page,
          including the ones in notifications; the browser's Back button
          already does the exact thing better. */}
      <TaskDetail task={task} actor={actor} now={new Date()} variant="page" closeHref="/board" />
    </main>
  );
}
