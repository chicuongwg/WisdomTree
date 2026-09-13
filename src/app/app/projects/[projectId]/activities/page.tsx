import { listAppProjectActivities } from "@/modules/application";
import { requireProjectModule } from "../_lib/workspace-context";
import { ActivitiesView } from "./_components/activities-view";

export default async function ProjectActivitiesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "activities");
  const activities = await listAppProjectActivities(actor, projectId);
  return (
    <ActivitiesView
      projectId={projectId}
      locale={application.locale}
      activities={activities}
      canCreate={workspace.project.capabilities.canCreateActivity}
    />
  );
}
