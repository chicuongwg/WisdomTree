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
      <div className="ui-next-project-workspace">
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
        <div className="ui-next-project-workspace__content">
          <div className="ui-next-project-module-frame">{children}</div>
        </div>
      </div>
    </PageContainer>
  );
}
