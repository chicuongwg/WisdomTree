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
  canAccessAdministration = false,
}: {
  displayName: string;
  locale: UiLocale;
  supportedLocales: UiLocale[];
  projects: ShellProject[];
  unreadNotifications?: number;
  canAccessAdministration?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const brandName = process.env.NEXT_PUBLIC_APP_BRAND || translate(locale, "shell.tmkt");
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const pathname = usePathname();
  const currentProjectId = pathname.match(/^\/app\/projects\/([^/]+)/)?.[1] ?? null;

  return (
    <header className="ui-next-app-header col-span-full sticky top-0 z-20 h-[3.75rem] grid grid-cols-[minmax(8rem,1fr)_minmax(14rem,32rem)_max-content] max-lg:grid-cols-[auto_minmax(12rem,1fr)_auto] max-md:grid-cols-[auto_minmax(0,1fr)_auto] max-md:px-3 items-center gap-4 border-b border-ui-border px-6 bg-ui-surface">
      <div className="ui-next-app-header__context flex items-center gap-2">
        <IconButton
          type="button"
          variant="ghost"
          className="ui-next-mobile-menu-trigger hidden max-md:inline-flex"
          aria-label={translate(locale, "shell.menu")}
          onClick={() => setMobileOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </IconButton>
        <span className="ui-next-app-header__identity text-ui-text-secondary text-sm font-bold max-md:hidden">
          {brandName}
        </span>
      </div>
      <QuickSearch locale={locale} />
      <div className="ui-next-app-header__utilities flex items-center justify-end gap-2 max-md:min-w-0">
        <CreateDialog locale={locale} projects={projects} defaultProjectId={currentProjectId} />
        <Link
          href="/app/notifications"
          className="ui-next-notification-bell relative size-10 inline-grid place-items-center border border-ui-border rounded text-ui-text-secondary hover:bg-ui-surface-sunken hover:text-ui-text focus-visible:outline-2 focus-visible:outline-ui-focus focus-visible:outline-offset-2"
          aria-label={
            unreadNotifications
              ? `${translate(locale, "shell.notifications")} (${unreadNotifications})`
              : translate(locale, "shell.notifications")
          }
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5 fill-none stroke-current stroke-[1.8]"
          >
            <path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          {unreadNotifications ? (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] px-0.5 rounded-full bg-ui-danger text-white text-[0.65rem] font-bold leading-[1.15rem] text-center">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
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
        title={brandName}
        closeLabel={translate(locale, "common.close")}
      >
        <GlobalNavigation
          locale={locale}
          canAccessAdministration={canAccessAdministration}
          onNavigate={() => setMobileOpen(false)}
        />
      </Drawer>
    </header>
  );
}
