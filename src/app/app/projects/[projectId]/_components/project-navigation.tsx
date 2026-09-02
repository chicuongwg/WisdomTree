"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import type { getProjectWorkspace } from "@/modules/application";
import {
  runGuardedNoteNavigation,
  translate,
  type UiNextMessageKey,
} from "../../../../components/ui-next";

type WorkspaceModules = Awaited<ReturnType<typeof getProjectWorkspace>>["modules"];

const projectModules: Array<{
  segment: "" | "notes" | "materials" | "activities" | "tasks" | "people" | "library";
  module: keyof WorkspaceModules | null;
  labelKey: UiNextMessageKey;
}> = [
  { segment: "", module: null, labelKey: "project.overview" },
  { segment: "notes", module: "notes", labelKey: "project.notes" },
  { segment: "materials", module: "materials", labelKey: "project.materials" },
  { segment: "activities", module: "activities", labelKey: "project.activities" },
  { segment: "tasks", module: "tasks", labelKey: "project.tasks" },
  { segment: "people", module: "people", labelKey: "project.people" },
  { segment: "library", module: "library", labelKey: "project.library" },
];

export function ProjectNavigation({
  projectId,
  modules,
  locale,
}: {
  projectId: string;
  modules: WorkspaceModules;
  locale: UiLocale;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/app/projects/${projectId}`;
  const availableModules = projectModules.filter(
    (item) => item.module === null || modules[item.module],
  );
  const currentSegment = pathname.split("/")[4] ?? "";
  const current = availableModules.some((item) => item.segment === currentSegment)
    ? currentSegment
    : "";

  return (
    <nav
      className="ui-next-project-navigation"
      aria-label={translate(locale, "workspace.navigation")}
    >
      <div className="ui-next-project-navigation__links">
        {availableModules.map((item) => {
          const href = item.segment ? `${base}/${item.segment}` : base;
          const active = current === item.segment;
          return (
            <Link
              key={item.segment || "overview"}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              {translate(locale, item.labelKey)}
            </Link>
          );
        })}
      </div>
      <label className="ui-next-project-navigation__select">
        <span>{translate(locale, "workspace.chooseModule")}</span>
        <select
          className="ui-next-control"
          value={current}
          onChange={(event) => {
            const segment = event.target.value;
            const href = segment ? `${base}/${segment}` : base;
            if (!runGuardedNoteNavigation(() => router.push(href))) {
              event.currentTarget.value = current;
            }
          }}
        >
          {availableModules.map((item) => (
            <option key={item.segment || "overview"} value={item.segment}>
              {translate(locale, item.labelKey)}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
