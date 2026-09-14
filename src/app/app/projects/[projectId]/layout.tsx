import type { ReactNode } from "react";
import { PageContainer } from "../../../components/ui-next";
import { ProjectHeader } from "./_components/project-header";
import { ProjectNavigation } from "./_components/project-navigation";
import { getProjectWorkspaceContext } from "./_lib/workspace-context";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { application, projects, workspace } = await getProjectWorkspaceContext(projectId);

  return (
    <PageContainer width="full">
      <div className="ui-next-project-workspace grid grid-cols-[minmax(0,1fr)] min-w-0 gap-6">
        <ProjectHeader
          project={workspace.project}
          projects={projects}
          locale={application.locale}
        />
        <ProjectNavigation
          projectId={projectId}
          modules={workspace.modules}
          locale={application.locale}
          canEditProject={workspace.project.capabilities.canEditProject}
        />
        <div className="ui-next-project-workspace__content grid gap-6 min-w-0">
          <div className="ui-next-project-module-frame grid gap-6 min-w-0 max-w-[var(--ui-width-wide)]">
            {children}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
