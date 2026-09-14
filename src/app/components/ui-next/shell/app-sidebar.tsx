"use client";

import { useSyncExternalStore } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { translate } from "../localization";
import { IconButton } from "../primitives/button";
import { GlobalNavigation } from "./navigation";

const SIDEBAR_KEY = "wisdomtree.sidebar";
const readCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";
const readServerCollapsed = () => false;
const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-sidebar"],
  });
  return () => observer.disconnect();
};

export function AppSidebar({
  locale,
  canAccessAdministration,
}: {
  locale: UiLocale;
  canAccessAdministration: boolean;
}) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, readServerCollapsed);
  const label = translate(locale, collapsed ? "shell.expandSidebar" : "shell.collapseSidebar");

  function toggle() {
    const next = collapsed ? "expanded" : "collapsed";
    document.documentElement.dataset.sidebar = next;
    try {
      localStorage.setItem(SIDEBAR_KEY, next);
    } catch {
      // The current view still changes when storage is unavailable.
    }
  }

  return (
    <aside className="ui-next-app-sidebar row-start-2 sticky top-[3.75rem] h-[calc(100dvh-3.75rem)] overflow-y-auto self-start flex flex-col gap-6 border-r border-ui-border px-3 py-4 bg-ui-surface-sunken max-md:hidden">
      <GlobalNavigation locale={locale} canAccessAdministration={canAccessAdministration} />
      <IconButton
        type="button"
        variant="ghost"
        className="ui-next-app-sidebar__toggle hidden lg:inline-flex mt-auto self-end"
        aria-label={label}
        title={label}
        onClick={toggle}
      >
        <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
      </IconButton>
    </aside>
  );
}
