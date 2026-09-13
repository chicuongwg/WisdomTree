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
    <aside className="ui-next-app-sidebar">
      <div className="ui-next-app-sidebar__brand" aria-label="TMKT">
        <span className="ui-next-app-sidebar__mark" aria-hidden="true">
          WT
        </span>
        <span className="ui-next-app-sidebar__name">TMKT</span>
      </div>
      <GlobalNavigation locale={locale} canAccessAdministration={canAccessAdministration} />
      <IconButton
        type="button"
        variant="ghost"
        className="ui-next-app-sidebar__toggle"
        aria-label={label}
        title={label}
        onClick={toggle}
      >
        <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
      </IconButton>
    </aside>
  );
}
