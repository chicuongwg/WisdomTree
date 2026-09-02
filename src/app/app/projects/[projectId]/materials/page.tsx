import { ProjectModulePlaceholder } from "../_components/module-placeholder";
import { requireProjectModule } from "../_lib/workspace-context";

export default async function ProjectMaterialsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { application } = await requireProjectModule(projectId, "materials");
  return (
    <ProjectModulePlaceholder
      locale={application.locale}
      titleKey="project.materials"
      descriptionKey="workspace.materialsUnavailable"
    />
  );
}
