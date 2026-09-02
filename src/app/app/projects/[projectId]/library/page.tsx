import { ProjectModulePlaceholder } from "../_components/module-placeholder";
import { requireProjectModule } from "../_lib/workspace-context";

export default async function ProjectLibraryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { application } = await requireProjectModule(projectId, "library");
  return (
    <ProjectModulePlaceholder
      locale={application.locale}
      titleKey="project.library"
      descriptionKey="workspace.libraryUnavailable"
    />
  );
}
