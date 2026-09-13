import { requireProjectModule } from "../_lib/workspace-context";
import { listAppProjectPeople } from "@/modules/application";
import { PeopleDirectory } from "../../../people/_components/people-directory";

export default async function ProjectPeoplePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "people");
  const people = await listAppProjectPeople(actor, projectId);
  return (
    <PeopleDirectory
      locale={application.locale}
      people={people}
      projectId={projectId}
      canCreate={workspace.project.capabilities.canManagePeople}
    />
  );
}
