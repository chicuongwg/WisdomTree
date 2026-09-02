import { EmptyState, PageContainer, PageHeader, Stack, translate } from "../../components/ui-next";
import { ProjectList } from "../_components/project-list";
import { getAppRequestContext } from "../_lib/request-context";

export default async function AppProjectsPage() {
  const { application, projects } = await getAppRequestContext();
  return (
    <PageContainer width="wide">
      <Stack>
        <PageHeader
          title={translate(application.locale, "page.projects.title")}
          description={translate(application.locale, "page.projects.description")}
        />
        {projects.length ? (
          <ProjectList projects={projects} locale={application.locale} showDescription />
        ) : (
          <EmptyState
            title={translate(application.locale, "projects.emptyTitle")}
            description={translate(application.locale, "projects.emptyDescription")}
          />
        )}
      </Stack>
    </PageContainer>
  );
}
