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

        <div className="ui-next-overview-columns grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 items-start">
          <section
            className="ui-next-overview-section grid gap-4"
            aria-labelledby="overview-work-title"
          >
            <div className="ui-next-section-heading flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 id="overview-work-title" className="m-0 text-lg font-bold">
                  {translate(application.locale, "overview.myWork.title")}
                </h2>
                <p className="mt-1 text-ui-text-secondary text-sm">
                  {translate(application.locale, "overview.myWork.description")}
                </p>
              </div>
              <Link
                href="/app/my-work"
                className="text-ui-accent font-semibold hover:underline shrink-0 text-sm"
              >
                {translate(application.locale, "overview.myWork.open")}
              </Link>
            </div>
            {hasActiveWork ? (
              <Surface>
                <dl className="ui-next-work-summary grid grid-cols-1 sm:grid-cols-2 gap-4 m-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ui-text-secondary text-sm">
                      {translate(application.locale, "overview.myWork.tasks")}
                    </dt>
                    <dd className="m-0 text-lg font-bold">{overview.myWork.assignedTaskCount}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ui-text-secondary text-sm">
                      {translate(application.locale, "overview.myWork.activities")}
                    </dt>
                    <dd className="m-0 text-lg font-bold">{overview.myWork.activeActivityCount}</dd>
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

          <section
            className="ui-next-overview-section grid gap-4"
            aria-labelledby="overview-projects-title"
          >
            <div className="ui-next-section-heading flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 id="overview-projects-title" className="m-0 text-lg font-bold">
                  {translate(application.locale, "overview.projects.title")}
                </h2>
                <p className="mt-1 text-ui-text-secondary text-sm">
                  {translate(application.locale, "overview.projects.description")}
                </p>
              </div>
              <Link
                href="/app/projects"
                className="text-ui-accent font-semibold hover:underline shrink-0 text-sm"
              >
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
        </div>
        <section
          className="ui-next-overview-section grid gap-4"
          aria-labelledby="continue-research-title"
        >
          <Surface
            className="ui-next-continue-research flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            tone="sunken"
          >
            <div>
              <h2 id="continue-research-title" className="m-0 text-lg font-bold">
                {translate(application.locale, "overview.continue.title")}
              </h2>
              <p className="mt-1 text-ui-text-secondary text-sm">
                {translate(application.locale, "overview.continue.description")}
              </p>
            </div>
            <Link
              href="/app/search"
              className="text-ui-accent font-semibold hover:underline shrink-0 text-sm"
            >
              {translate(application.locale, "overview.continue.open")}
            </Link>
          </Surface>
        </section>
      </Stack>
    </PageContainer>
  );
}
