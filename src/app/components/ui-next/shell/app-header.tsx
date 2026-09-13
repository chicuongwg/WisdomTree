"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
  "id" | "name" | "researchLens" | "status" | "isPersonal" | "operationalMember" | "capabilities"
>;

export function AppHeader({
  displayName,
  locale,
  supportedLocales,
  projects,
  unreadNotifications = 0,
}: {
  displayName: string;
  locale: UiLocale;
  supportedLocales: UiLocale[];
  projects: ShellProject[];
  unreadNotifications?: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
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
        <Link
          href="/app/notifications"
          className="ui-next-notification-bell"
          aria-label={
            unreadNotifications
              ? `${translate(locale, "shell.notifications")} (${unreadNotifications})`
              : translate(locale, "shell.notifications")
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          {unreadNotifications ? (
            <span>{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>
          ) : null}
        </Link>
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
