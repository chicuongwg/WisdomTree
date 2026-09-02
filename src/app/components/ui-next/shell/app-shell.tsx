import type { ReactNode } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { GlobalNavigation } from "./navigation";
import { AppHeader } from "./app-header";

type ShellProject = Pick<
  AppProjectDto,
  "id" | "name" | "researchLens" | "status" | "operationalMember" | "capabilities"
>;

export function AppShell({
  children,
  displayName,
  locale,
  supportedLocales,
  projects,
}: {
  children: ReactNode;
  displayName: string;
  locale: UiLocale;
  supportedLocales: UiLocale[];
  projects: ShellProject[];
}) {
  return (
    <div className="ui-next-app-shell">
      <aside className="ui-next-app-sidebar">
        <div className="ui-next-app-sidebar__brand" aria-label="TMKT">
          <span className="ui-next-app-sidebar__mark" aria-hidden="true">
            WT
          </span>
          <span className="ui-next-app-sidebar__name">TMKT</span>
        </div>
        <GlobalNavigation locale={locale} />
      </aside>
      <AppHeader
        displayName={displayName}
        locale={locale}
        supportedLocales={supportedLocales}
        projects={projects}
      />
      <main id="app-main" className="ui-next-app-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
