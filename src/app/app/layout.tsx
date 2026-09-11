import type { ReactNode } from "react";
import { AppShell, SkipLink, translate } from "../components/ui-next";
import "../components/ui-next/styles.css";
import "../components/ui-next/shell.css";
import "../components/ui-next/overview-projects.css";
import "../components/ui-next/project-workspace.css";
import "../components/ui-next/notes.css";
import "../components/ui-next/materials.css";
import "../components/ui-next/activities-tasks.css";
import { getAppRequestContext } from "./_lib/request-context";

export default async function TargetAppLayout({ children }: { children: ReactNode }) {
  const { application, projects } = await getAppRequestContext();
  return (
    <div className="ui-next ui-next-app-root">
      <SkipLink href="#app-main">{translate(application.locale, "preview.skip")}</SkipLink>
      <AppShell
        displayName={application.currentUser.displayName}
        locale={application.locale}
        supportedLocales={application.supportedUiLocales}
        projects={projects}
      >
        {children}
      </AppShell>
    </div>
  );
}
