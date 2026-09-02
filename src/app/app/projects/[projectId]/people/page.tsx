import { ProjectModulePlaceholder } from "../_components/module-placeholder";
import { requireProjectModule } from "../_lib/workspace-context";

export default async function ProjectPeoplePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { application } = await requireProjectModule(projectId, "people");
  return (
    <ProjectModulePlaceholder
      locale={application.locale}
      titleKey="project.people"
      descriptionKey="workspace.peopleUnavailable"
    />
  );
}
