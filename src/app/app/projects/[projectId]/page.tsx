import { redirect } from "next/navigation";
import { Surface, translate } from "../../../components/ui-next";
import { getProjectWorkspaceContext } from "./_lib/workspace-context";

const switchableModules = [
  "notes",
  "materials",
  "activities",
  "tasks",
  "people",
  "library",
] as const;

export default async function AppProjectOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { projectId } = await params;
  const requestedModule = (await searchParams).module;
  const { application, workspace } = await getProjectWorkspaceContext(projectId);

  if (
    requestedModule &&
    switchableModules.includes(requestedModule as (typeof switchableModules)[number])
  ) {
    if (workspace.modules[requestedModule as (typeof switchableModules)[number]]) {
      redirect(`/app/projects/${projectId}/${requestedModule}`);
    }
    redirect(`/app/projects/${projectId}`);
  }

  return (
    <div className="ui-next-project-overview">
      <section aria-labelledby="project-about-title">
        <h2 id="project-about-title">{translate(application.locale, "workspace.about")}</h2>
        <Surface>
          <p dir="auto">
            {workspace.project.description ||
              (workspace.project.isPersonal &&
              workspace.project.researchLens === "Personal research workspace"
                ? translate(application.locale, "projects.personalWorkspace")
                : workspace.project.researchLens)}
          </p>
        </Surface>
      </section>
      <section aria-labelledby="project-access-title">
        <h2 id="project-access-title">{translate(application.locale, "workspace.access")}</h2>
        <Surface tone="sunken">
          <h3>
            {translate(
              application.locale,
              workspace.project.operationalMember
                ? "projects.workAccess"
                : "projects.researchAccess",
            )}
          </h3>
          <p>
            {translate(
              application.locale,
              workspace.project.operationalMember
                ? "workspace.workAccessDescription"
                : "workspace.researchAccessDescription",
            )}
          </p>
          <ul>
            <li>{translate(application.locale, "workspace.canReadResearch")}</li>
            {(
              [
                "canCreateNote",
                "canCreateMaterial",
                "canCreateActivity",
                "canCreateTask",
                "canManagePeople",
                "canEditProject",
                "canPublish",
              ] as const
            )
              .filter((capability) => workspace.project.capabilities[capability])
              .map((capability) => (
                <li key={capability}>
                  {translate(
                    application.locale,
                    capability === "canEditProject" && workspace.project.isPersonal
                      ? "workspace.canEditPersonalProject"
                      : `workspace.${capability}`,
                  )}
                </li>
              ))}
          </ul>
        </Surface>
      </section>
    </div>
  );
}
