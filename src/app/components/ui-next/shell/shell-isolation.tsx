"use client";

import { useEffect } from "react";

/** Remove the legacy scroll container from the tab order while /app is active. */
export function ShellIsolation() {
  useEffect(() => {
    const root = document.querySelector(".ui-next-app-root");
    const legacyMain = root?.closest<HTMLElement>(".main-area") ?? null;
    const previousTabIndex = legacyMain?.getAttribute("tabindex") ?? null;
    legacyMain?.setAttribute("tabindex", "-1");

    const legacyPalette = document.querySelector<HTMLDialogElement>("dialog.palette[open]");
    legacyPalette?.close();

    return () => {
      if (!legacyMain) return;
      if (previousTabIndex === null) legacyMain.removeAttribute("tabindex");
      else legacyMain.setAttribute("tabindex", previousTabIndex);
    };
  }, []);

  return null;
}
