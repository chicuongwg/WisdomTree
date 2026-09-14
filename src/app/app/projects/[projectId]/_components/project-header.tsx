import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { StatusBadge, translate } from "../../../../components/ui-next";
import { ProjectSwitcher } from "./project-switcher";

const statusTone = {
  active: "success",
  paused: "warning",
  completed: "information",
  archived: "neutral",
} as const;

const statusMessageKey = {
  active: "shell.projectStatus.active",
  paused: "shell.projectStatus.paused",
  completed: "shell.projectStatus.completed",
  archived: "shell.projectStatus.archived",
} as const;

export function ProjectHeader({
  project,
  projects,
  locale,
}: {
  project: AppProjectDto;
  projects: Pick<AppProjectDto, "id" | "name" | "isPersonal">[];
  locale: UiLocale;
}) {
  return (
    <header className="ui-next-project-header grid gap-4 max-w-[var(--ui-width-wide)]">
      <div className="ui-next-project-header__identity grid grid-cols-[minmax(8rem,15rem)_minmax(0,1fr)_auto] max-lg:grid-cols-[minmax(0,1fr)] items-center gap-4">
        <ProjectSwitcher projectId={project.id} projects={projects} locale={locale} />
        <div>
          <h1 className="m-0 text-2xl font-bold leading-tight break-words">
            {project.isPersonal ? translate(locale, "projects.myProject") : project.name}
          </h1>
          <p
            className="ui-next-project-header__lens max-w-[var(--ui-width-reading)] mt-2 text-ui-text-secondary break-words col-span-full max-lg:col-span-1"
            dir="auto"
          >
            {project.isPersonal && project.researchLens === "Personal research workspace"
              ? translate(locale, "projects.personalWorkspace")
              : project.researchLens}
          </p>
        </div>
        <div className="ui-next-project-header__badges flex flex-wrap justify-end max-lg:justify-start gap-2">
          <StatusBadge tone={statusTone[project.status]}>
            {translate(locale, statusMessageKey[project.status])}
          </StatusBadge>
          <StatusBadge tone={project.operationalMember ? "accent" : "neutral"}>
            {translate(
              locale,
              project.operationalMember ? "projects.workAccess" : "projects.researchAccess",
            )}
          </StatusBadge>
          {project.features.libraryCirculation ? (
            <StatusBadge tone="information">{translate(locale, "projects.library")}</StatusBadge>
          ) : null}
        </div>
      </div>
    </header>
  );
}
