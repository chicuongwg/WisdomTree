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
    <PageContainer width="wide">
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
        />
        <div className="ui-next-project-workspace__content">{children}</div>
      </div>
    </PageContainer>
  );
}
