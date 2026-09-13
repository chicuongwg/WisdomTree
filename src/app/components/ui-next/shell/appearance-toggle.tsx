"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { translate } from "../localization";

const THEME_KEY = "wt-theme";
const readTheme = () => document.documentElement.dataset.theme === "dark";
const readServerTheme = () => false;
const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};

export function AppearanceToggle({ locale }: { locale: UiLocale }) {
  const dark = useSyncExternalStore(subscribe, readTheme, readServerTheme);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") document.documentElement.dataset.theme = stored;
    } catch {
      // The pre-paint theme still applies when storage is unavailable.
    }
  }, []);

  return (
    <select
      className="ui-next-control"
      aria-label={translate(locale, "shell.appearance")}
      value={dark ? "dark" : "light"}
      onChange={(event) => {
        const next = event.target.value;
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // The active tab still changes when storage is unavailable.
        }
      }}
    >
      <option value="light">{translate(locale, "preview.light")}</option>
      <option value="dark">{translate(locale, "preview.dark")}</option>
    </select>
  );
}
