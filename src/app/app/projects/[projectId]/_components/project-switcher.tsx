"use client";

import { usePathname, useRouter } from "next/navigation";
import type { AppProjectDto } from "@/modules/application";
import type { UiLocale } from "@/modules/auth/profile";
import { runGuardedNoteNavigation, translate } from "../../../../components/ui-next";

type ProjectChoice = Pick<AppProjectDto, "id" | "name" | "isPersonal">;

const moduleSegments = new Set(["notes", "materials", "activities", "tasks", "people", "library"]);

export function projectSwitchHref(projectId: string, pathname: string) {
  const currentSegment = pathname.split("/")[4];
  const base = `/app/projects/${projectId}`;
  return currentSegment && moduleSegments.has(currentSegment)
    ? `${base}?module=${currentSegment}`
    : base;
}

export function ProjectSwitcher({
  projectId,
  projects,
  locale,
}: {
  projectId: string;
  projects: ProjectChoice[];
  locale: UiLocale;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className="ui-next-project-switcher max-w-xs grid gap-1 text-ui-text-secondary text-sm font-semibold">
      <span className="ui-next-visually-hidden">
        {translate(locale, "workspace.switchProject")}
      </span>
      <select
        className="ui-next-control"
        value={projectId}
        onChange={(event) => {
          const href = projectSwitchHref(event.target.value, pathname);
          if (!runGuardedNoteNavigation(() => router.push(href))) {
            event.currentTarget.value = projectId;
          }
        }}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.isPersonal ? translate(locale, "projects.myProject") : project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
