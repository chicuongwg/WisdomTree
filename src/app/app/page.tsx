import Link from "next/link";
import { getTmktOverview } from "@/modules/application";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  Stack,
  Surface,
  translate,
} from "../components/ui-next";
import { ProjectList } from "./_components/project-list";
import { getAppRequestContext } from "./_lib/request-context";

export default async function AppOverviewPage() {
  const { actor, application, projects } = await getAppRequestContext();
  const overview = await getTmktOverview(actor);
  const overviewProjectIds = new Set(overview.projects.map((project) => project.id));
  const overviewProjects = projects.filter((project) => overviewProjectIds.has(project.id));
  const hasActiveWork =
    overview.myWork.assignedTaskCount > 0 || overview.myWork.activeActivityCount > 0;

  return (
    <PageContainer width="wide">
      <Stack>
        <PageHeader
          title={translate(application.locale, "page.overview.title")}
          description={translate(application.locale, "page.overview.description")}
        />

        <section className="ui-next-overview-section" aria-labelledby="overview-work-title">
          <div className="ui-next-section-heading">
            <div>
              <h2 id="overview-work-title">
                {translate(application.locale, "overview.myWork.title")}
              </h2>
              <p>{translate(application.locale, "overview.myWork.description")}</p>
            </div>
            <Link href="/app/my-work">{translate(application.locale, "overview.myWork.open")}</Link>
          </div>
          {hasActiveWork ? (
            <Surface>
              <dl className="ui-next-work-summary">
                <div>
                  <dt>{translate(application.locale, "overview.myWork.tasks")}</dt>
                  <dd>{overview.myWork.assignedTaskCount}</dd>
                </div>
                <div>
                  <dt>{translate(application.locale, "overview.myWork.activities")}</dt>
                  <dd>{overview.myWork.activeActivityCount}</dd>
                </div>
              </dl>
            </Surface>
          ) : (
            <EmptyState
              title={translate(application.locale, "overview.myWork.emptyTitle")}
              description={translate(application.locale, "overview.myWork.emptyDescription")}
            />
          )}
        </section>

        <section className="ui-next-overview-section" aria-labelledby="overview-projects-title">
          <div className="ui-next-section-heading">
            <div>
              <h2 id="overview-projects-title">
                {translate(application.locale, "overview.projects.title")}
              </h2>
              <p>{translate(application.locale, "overview.projects.description")}</p>
            </div>
            <Link href="/app/projects">
              {translate(application.locale, "overview.projects.open")}
            </Link>
          </div>
          {overviewProjects.length ? (
            <ProjectList projects={overviewProjects} locale={application.locale} />
          ) : (
            <EmptyState
              title={translate(application.locale, "projects.emptyTitle")}
              description={translate(application.locale, "projects.emptyDescription")}
            />
          )}
        </section>

        <section className="ui-next-overview-section" aria-labelledby="continue-research-title">
          <Surface className="ui-next-continue-research" tone="sunken">
            <div>
              <h2 id="continue-research-title">
                {translate(application.locale, "overview.continue.title")}
              </h2>
              <p>{translate(application.locale, "overview.continue.description")}</p>
            </div>
            <Link href="/app/search">
              {translate(application.locale, "overview.continue.open")}
            </Link>
          </Surface>
        </section>
      </Stack>
    </PageContainer>
  );
}
