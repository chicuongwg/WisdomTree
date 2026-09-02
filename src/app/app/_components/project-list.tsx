import Link from "next/link";
import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { StatusBadge, Surface, translate } from "../../components/ui-next";

const statusOrder: Record<AppProjectDto["status"], number> = {
  active: 0,
  paused: 1,
  completed: 2,
  archived: 3,
};

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

export function orderProjects(projects: readonly AppProjectDto[], locale: UiLocale) {
  const collator = new Intl.Collator(locale === "vi" ? "vi" : "en");
  return [...projects].sort(
    (left, right) =>
      Number(right.operationalMember) - Number(left.operationalMember) ||
      statusOrder[left.status] - statusOrder[right.status] ||
      collator.compare(left.name, right.name) ||
      left.id.localeCompare(right.id),
  );
}

export function ProjectList({
  projects,
  locale,
  showDescription = false,
}: {
  projects: readonly AppProjectDto[];
  locale: UiLocale;
  showDescription?: boolean;
}) {
  return (
    <ul className="ui-next-project-list" aria-label={translate(locale, "projects.listLabel")}>
      {orderProjects(projects, locale).map((project) => (
        <li key={project.id}>
          <Surface className="ui-next-project-card">
            <div className="ui-next-project-card__main">
              <div className="ui-next-project-card__title-row">
                <h3>
                  <Link href={`/app/projects/${project.id}`}>{project.name}</Link>
                </h3>
                <StatusBadge tone={statusTone[project.status]}>
                  {translate(locale, statusMessageKey[project.status])}
                </StatusBadge>
              </div>
              <p className="ui-next-project-card__lens" dir="auto">
                {project.researchLens}
              </p>
              {showDescription && project.description ? (
                <p className="ui-next-project-card__description" dir="auto">
                  {project.description}
                </p>
              ) : null}
            </div>
            <div className="ui-next-project-card__meta">
              <StatusBadge tone={project.operationalMember ? "accent" : "neutral"}>
                {translate(
                  locale,
                  project.operationalMember ? "projects.workAccess" : "projects.researchAccess",
                )}
              </StatusBadge>
              {project.features.libraryCirculation ? (
                <StatusBadge tone="information">
                  {translate(locale, "projects.library")}
                </StatusBadge>
              ) : null}
            </div>
          </Surface>
        </li>
      ))}
    </ul>
  );
}
