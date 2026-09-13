"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import type { getProjectWorkspace } from "@/modules/application";
import { translate, type UiNextMessageKey } from "../../../../components/ui-next";

type WorkspaceModules = Awaited<ReturnType<typeof getProjectWorkspace>>["modules"];

const projectModules: Array<{
  segment: "" | "notes" | "materials" | "activities" | "tasks" | "people" | "library" | "settings";
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
  canEditProject = false,
}: {
  projectId: string;
  modules: WorkspaceModules;
  locale: UiLocale;
  canEditProject?: boolean;
}) {
  const pathname = usePathname();
  const linksRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    linksRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  const base = `/app/projects/${projectId}`;
  const availableModules = projectModules.filter(
    (item) => item.module === null || modules[item.module],
  );
  const navigationItems = canEditProject
    ? [
        ...availableModules,
        { segment: "settings" as const, module: null, labelKey: "project.settings" as const },
      ]
    : availableModules;
  const currentSegment = pathname.split("/")[4] ?? "";
  const current = navigationItems.some((item) => item.segment === currentSegment)
    ? currentSegment
    : "";

  return (
    <nav
      className="ui-next-project-navigation"
      aria-label={translate(locale, "workspace.navigation")}
    >
      <div ref={linksRef} className="ui-next-project-navigation__links">
        {navigationItems.map((item) => {
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
    </nav>
  );
}
