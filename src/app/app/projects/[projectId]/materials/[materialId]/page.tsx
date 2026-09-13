import { notFound } from "next/navigation";
import {
  getAppProjectMaterial,
  getAppProjectMaterialPhysical,
  getAppCollaborationContext,
  toApplicationError,
} from "@/modules/application";
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
    const physical = workspace.project.capabilities.isLibraryOperator
      ? await getAppProjectMaterialPhysical(actor, { projectId, materialId })
      : null;
    let collaboration: Awaited<ReturnType<typeof getAppCollaborationContext>> | null = null;
    try {
      collaboration = await getAppCollaborationContext(actor, {
        kind: "material",
        projectId,
        entityId: materialId,
      });
    } catch (error) {
      if (toApplicationError(error).error !== "not_found") throw error;
    }
    return (
      <MaterialDetail
        projectId={projectId}
        locale={application.locale}
        material={{ ...material, physical }}
        canManageMaterial={workspace.project.capabilities.canCreateMaterial}
        canStewardMaterial={material.capabilities.canSteward}
        canManagePhysical={workspace.project.capabilities.isLibraryOperator}
        collaboration={collaboration}
      />
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    if (applicationError.error === "not_found" || applicationError.error === "forbidden")
      notFound();
    throw error;
  }
}
