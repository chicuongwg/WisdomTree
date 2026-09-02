import { ProjectModulePlaceholder } from "../_components/module-placeholder";
import { requireProjectModule } from "../_lib/workspace-context";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { application } = await requireProjectModule(projectId, "tasks");
  return (
    <ProjectModulePlaceholder
      locale={application.locale}
      titleKey="project.tasks"
      descriptionKey="workspace.tasksUnavailable"
    />
  );
}
