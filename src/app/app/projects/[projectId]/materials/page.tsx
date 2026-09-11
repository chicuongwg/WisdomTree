import { listAppProjectMaterials } from "@/modules/application";
import { requireProjectModule } from "../_lib/workspace-context";
import { MaterialsView } from "./_components/materials-view";

export default async function ProjectMaterialsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "materials");
  const materials = await listAppProjectMaterials(actor, projectId);
  return (
    <MaterialsView
      projectId={projectId}
      locale={application.locale}
      materials={materials}
      canCreateMaterial={workspace.project.capabilities.canCreateMaterial}
    />
  );
}
