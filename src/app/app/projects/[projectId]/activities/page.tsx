import { ProjectModulePlaceholder } from "../_components/module-placeholder";
import { requireProjectModule } from "../_lib/workspace-context";

export default async function ProjectActivitiesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { application } = await requireProjectModule(projectId, "activities");
  return (
    <ProjectModulePlaceholder
      locale={application.locale}
      titleKey="project.activities"
      descriptionKey="workspace.activitiesUnavailable"
    />
  );
}
