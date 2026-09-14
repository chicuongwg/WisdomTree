import type { ReactNode } from "react";
import { AppShell, SkipLink, translate } from "../components/ui-next";
import "../components/ui-next/styles.css";
import "../components/ui-next/shell.css";
import "../components/ui-next/project-workspace.css";
import "../components/ui-next/notes.css";
import "../components/ui-next/materials.css";
import "../components/ui-next/activities-tasks.css";
import { getAppRequestContext } from "./_lib/request-context";
import { unreadAppNotificationCount } from "@/modules/application";

export default async function TargetAppLayout({ children }: { children: ReactNode }) {
  const { actor, application, projects } = await getAppRequestContext();
  const unreadNotifications = await unreadAppNotificationCount(actor);
  const languageScript = `document.documentElement.lang=${JSON.stringify(application.locale)};`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: languageScript }} />
      <div className="ui-next ui-next-app-root">
        <SkipLink href="#app-main">{translate(application.locale, "preview.skip")}</SkipLink>
        <AppShell
          displayName={application.currentUser.displayName}
          locale={application.locale}
          supportedLocales={application.supportedUiLocales}
          projects={projects}
          canAccessAdministration={application.globalCapabilities.canAccessAdministration}
          unreadNotifications={unreadNotifications}
        >
          {children}
        </AppShell>
      </div>
    </>
  );
}
