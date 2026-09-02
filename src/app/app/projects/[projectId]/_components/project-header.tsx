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
  projects: Pick<AppProjectDto, "id" | "name">[];
  locale: UiLocale;
}) {
  return (
    <header className="ui-next-project-header">
      <ProjectSwitcher projectId={project.id} projects={projects} locale={locale} />
      <div className="ui-next-project-header__identity">
        <div>
          <h1>{project.name}</h1>
          <p dir="auto">{project.researchLens}</p>
        </div>
        <div className="ui-next-project-header__badges">
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
