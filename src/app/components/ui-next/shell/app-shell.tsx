import type { ReactNode } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";

type ShellProject = Pick<
  AppProjectDto,
  "id" | "name" | "researchLens" | "status" | "isPersonal" | "operationalMember" | "capabilities"
>;

export function AppShell({
  children,
  displayName,
  locale,
  supportedLocales,
  projects,
  canAccessAdministration = false,
  unreadNotifications = 0,
}: {
  children: ReactNode;
  displayName: string;
  locale: UiLocale;
  supportedLocales: UiLocale[];
  projects: ShellProject[];
  canAccessAdministration?: boolean;
  unreadNotifications?: number;
}) {
  return (
    <div className="ui-next-app-shell">
      <AppHeader
        displayName={displayName}
        locale={locale}
        supportedLocales={supportedLocales}
        projects={projects}
        canAccessAdministration={canAccessAdministration}
        unreadNotifications={unreadNotifications}
      />
      <AppSidebar locale={locale} canAccessAdministration={canAccessAdministration} />
      <main id="app-main" className="ui-next-app-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
