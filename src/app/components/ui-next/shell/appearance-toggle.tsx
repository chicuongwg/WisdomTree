"use client";

import { useSyncExternalStore } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { Button } from "../primitives/button";
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
  const label = translate(locale, dark ? "shell.useLightTheme" : "shell.useDarkTheme");

  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={dark}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // The active tab still changes when storage is unavailable.
        }
      }}
    >
      {label}
    </Button>
  );
}
