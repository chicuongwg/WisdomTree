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
    <div className="ui-next-app-shell min-h-dvh grid grid-cols-[15rem_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] bg-ui-bg">
      <AppHeader
        displayName={displayName}
        locale={locale}
        supportedLocales={supportedLocales}
        projects={projects}
        canAccessAdministration={canAccessAdministration}
        unreadNotifications={unreadNotifications}
      />
      <AppSidebar locale={locale} canAccessAdministration={canAccessAdministration} />
      <main
        id="app-main"
        className="ui-next-app-main col-start-2 row-start-2 p-6 overflow-y-auto"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
