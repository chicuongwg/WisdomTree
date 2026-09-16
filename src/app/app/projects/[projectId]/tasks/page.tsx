import {
  getAppProjectTaskKpis,
  listAppProjectActivities,
  listAppProjectTaskAssignees,
  listAppProjectTasks,
} from "@/modules/application";
import { requireProjectModule } from "../_lib/workspace-context";
import { TasksView } from "./_components/tasks-view";

export default async function ProjectTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string; task?: string }>;
}) {
  const { projectId } = await params;
  const { view, task } = await searchParams;
  const { actor, application, workspace } = await requireProjectModule(projectId, "tasks");
  const [tasks, activities, assignees, kpis] = await Promise.all([
    listAppProjectTasks(actor, projectId),
    listAppProjectActivities(actor, projectId),
    listAppProjectTaskAssignees(actor, projectId),
    getAppProjectTaskKpis(actor, projectId),
  ]);
  return (
    <TasksView
      projectId={projectId}
      locale={application.locale}
      tasks={tasks}
      activities={activities}
      assignees={assignees}
      kpis={kpis}
      canCreate={workspace.project.capabilities.canCreateTask}
      canManageActivity={workspace.project.capabilities.canCreateActivity}
      canClaim={workspace.project.operationalMember}
      view={
        view === "kpis"
          ? "kpis"
          : view === "kanban"
            ? "kanban"
            : view === "table"
              ? "table"
              : view === "sprint"
                ? "sprint"
                : "list"
      }
      initialTaskId={task}
    />
  );
}
