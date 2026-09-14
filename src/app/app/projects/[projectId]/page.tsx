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
    <div className="ui-next-project-overview grid grid-cols-2 max-md:grid-cols-1 gap-6">
      <section aria-labelledby="project-about-title" className="min-w-0">
        <h2 id="project-about-title" className="m-0 mb-3 text-lg font-bold">
          {translate(application.locale, "workspace.about")}
        </h2>
        <Surface>
          <p dir="auto" className="m-0 leading-relaxed break-words">
            {workspace.project.description ||
              (workspace.project.isPersonal &&
              workspace.project.researchLens === "Personal research workspace"
                ? translate(application.locale, "projects.personalWorkspace")
                : workspace.project.researchLens)}
          </p>
        </Surface>
      </section>
      <section aria-labelledby="project-access-title" className="min-w-0">
        <h2 id="project-access-title" className="m-0 mb-3 text-lg font-bold">
          {translate(application.locale, "workspace.access")}
        </h2>
        <Surface tone="sunken">
          <h3 className="m-0 text-base font-semibold">
            {translate(
              application.locale,
              workspace.project.operationalMember
                ? "projects.workAccess"
                : "projects.researchAccess",
            )}
          </h3>
          <p className="m-0 mt-2 text-sm text-ui-text-secondary">
            {translate(
              application.locale,
              workspace.project.operationalMember
                ? "workspace.workAccessDescription"
                : "workspace.researchAccessDescription",
            )}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-ui-text-secondary pl-5 list-disc">
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
