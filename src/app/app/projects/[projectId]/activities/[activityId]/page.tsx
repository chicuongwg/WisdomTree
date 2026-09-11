import { getAppActivityWorkspace } from "@/modules/application";
import { requireProjectModule } from "../../_lib/workspace-context";
import { ActivityWorkspace } from "../_components/activity-workspace";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; activityId: string }>;
}) {
  const { projectId, activityId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "activities");
  const data = await getAppActivityWorkspace(actor, projectId, activityId);
  return (
    <ActivityWorkspace
      projectId={projectId}
      locale={application.locale}
      canEdit={workspace.project.capabilities.canCreateActivity}
      {...data}
    />
  );
}
