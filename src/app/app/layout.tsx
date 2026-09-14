import type { ReactNode } from "react";
import { AppShell, SkipLink, translate } from "../components/ui-next";
import styles from "../components/ui-next/styles.module.css";
import shellStyles from "../components/ui-next/shell.module.css";
import overviewStyles from "../components/ui-next/overview-projects.module.css";
import projectStyles from "../components/ui-next/project-workspace.module.css";
import notesStyles from "../components/ui-next/notes.module.css";
import materialsStyles from "../components/ui-next/materials.module.css";
import activitiesStyles from "../components/ui-next/activities-tasks.module.css";
import calendarStyles from "../components/ui-next/calendar.module.css";
import libraryStyles from "../components/ui-next/library.module.css";
import governanceStyles from "../components/ui-next/governance.module.css";
import accountStyles from "../components/ui-next/account.module.css";
import collaborationStyles from "../components/ui-next/collaboration.module.css";
import { getAppRequestContext } from "./_lib/request-context";
import { unreadAppNotificationCount } from "@/modules/application";

export default async function TargetAppLayout({ children }: { children: ReactNode }) {
  const { actor, application, projects } = await getAppRequestContext();
  const unreadNotifications = await unreadAppNotificationCount(actor);
  const languageScript = `document.documentElement.lang=${JSON.stringify(application.locale)};`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: languageScript }} />
      <div
        className={[
          "ui-next",
          "ui-next-app-root",
          styles.root,
          shellStyles.root,
          overviewStyles.root,
          projectStyles.root,
          notesStyles.root,
          materialsStyles.root,
          activitiesStyles.root,
          calendarStyles.root,
          libraryStyles.root,
          governanceStyles.root,
          accountStyles.root,
          collaborationStyles.root,
        ].join(" ")}
      >
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
