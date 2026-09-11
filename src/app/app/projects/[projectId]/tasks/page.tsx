import { listAppProjectActivities, listAppProjectTaskAssignees, listAppProjectTasks } from "@/modules/application";
import { requireProjectModule } from "../_lib/workspace-context";
import { TasksView } from "./_components/tasks-view";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "tasks");
  const [tasks, activities, assignees] = await Promise.all([
    listAppProjectTasks(actor, projectId),
    listAppProjectActivities(actor, projectId),
    listAppProjectTaskAssignees(actor, projectId),
  ]);
  return <TasksView projectId={projectId} locale={application.locale} tasks={tasks} activities={activities} assignees={assignees} canCreate={workspace.project.capabilities.canCreateTask} />;
}
