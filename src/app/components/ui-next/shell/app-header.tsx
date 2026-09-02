"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { Drawer } from "../overlays/drawer";
import { IconButton } from "../primitives/button";
import { translate } from "../localization";
import { AccountMenu } from "./account-menu";
import { CreateDialog } from "./create-dialog";
import { GlobalNavigation } from "./navigation";
import { QuickSearch } from "./quick-search";

type ShellProject = Pick<
  AppProjectDto,
  "id" | "name" | "researchLens" | "status" | "operationalMember" | "capabilities"
>;

export function AppHeader({
  displayName,
  locale,
  supportedLocales,
  projects,
}: {
  displayName: string;
  locale: UiLocale;
  supportedLocales: UiLocale[];
  projects: ShellProject[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentProjectId = pathname.match(/^\/app\/projects\/([^/]+)/)?.[1] ?? null;

  return (
    <header className="ui-next-app-header">
      <div className="ui-next-app-header__context">
        <IconButton
          type="button"
          variant="ghost"
          className="ui-next-mobile-menu-trigger"
          aria-label={translate(locale, "shell.menu")}
          onClick={() => setMobileOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </IconButton>
        <span className="ui-next-app-header__identity">{translate(locale, "shell.tmkt")}</span>
      </div>
      <QuickSearch locale={locale} />
      <div className="ui-next-app-header__utilities">
        <CreateDialog locale={locale} projects={projects} defaultProjectId={currentProjectId} />
        <AccountMenu
          displayName={displayName}
          locale={locale}
          supportedLocales={supportedLocales}
        />
      </div>
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={translate(locale, "shell.tmkt")}
        closeLabel={translate(locale, "common.close")}
      >
        <GlobalNavigation locale={locale} onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </header>
  );
}
