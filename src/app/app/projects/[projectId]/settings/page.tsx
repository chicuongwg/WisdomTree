import { notFound } from "next/navigation";
import {
  listAppProjectCapabilities,
  listAppProjectMemberCandidates,
  listAppProjectMembers,
  listAppProjectLibraryOperators,
} from "@/modules/application";
import { getProjectWorkspaceContext } from "../_lib/workspace-context";
import { ProjectSettingsWorkspace } from "./_components/project-settings-workspace";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application, workspace } = await getProjectWorkspaceContext(projectId);
  if (!workspace.project.capabilities.canEditProject) notFound();
  const personal = workspace.project.isPersonal;
  const [members, candidates, capabilities, operators] = personal
    ? [[], [], [], []]
    : await Promise.all([
        listAppProjectMembers(actor, projectId),
        listAppProjectMemberCandidates(actor, projectId),
        listAppProjectCapabilities(actor, projectId),
        listAppProjectLibraryOperators(actor, projectId),
      ]);
  return (
    <ProjectSettingsWorkspace
      locale={application.locale}
      project={{ ...workspace.project, version: workspace.project.version ?? 0 }}
      personal={personal}
      members={members}
      candidates={candidates}
      operators={operators}
      libraryEnabled={
        !personal && capabilities.some((item) => item.capability === "library_circulation")
      }
    />
  );
}
