import { notFound } from "next/navigation";
import { getAppProjectMaterial, toApplicationError } from "@/modules/application";
import { requireProjectModule } from "../../_lib/workspace-context";
import { MaterialDetail } from "../_components/material-detail";

export default async function ProjectMaterialDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; materialId: string }>;
}) {
  const { projectId, materialId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "materials");
  try {
    const material = await getAppProjectMaterial(actor, projectId, materialId);
    return (
      <MaterialDetail
        projectId={projectId}
        locale={application.locale}
        material={material}
        canManageMaterial={workspace.project.capabilities.canCreateMaterial}
      />
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    if (applicationError.error === "not_found" || applicationError.error === "forbidden")
      notFound();
    throw error;
  }
}
