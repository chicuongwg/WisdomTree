"use client";

import { useSyncExternalStore } from "react";
import { T } from "@/lib/vi";

// Light/dark switch. An inline script in the root layout stamps
// data-theme on <html> before first paint; this button just flips it
// and persists the choice.
//
// <html> is the single source of truth, read through useSyncExternalStore:
// useState + useEffect painted the sun for one frame in dark mode, because the
// effect only ran after the first paint. The server has no theme to read, so
// the server snapshot is "light" — React re-reads the real value at the end of
// hydration, before the browser paints, and without a hydration mismatch.

const KEY = "wt-theme";

const readTheme = () => document.documentElement.dataset.theme === "dark";
const readServerTheme = () => false;
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, readTheme, readServerTheme);

  // No setState: stamping <html> is the change, and the observer tells React.
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: theme just won't persist */
    }
  };

  const stroke = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <button
      type="button"
      className="rail-btn"
      onClick={toggle}
      title={T.themeToggle}
      /* The same words the tooltip shows. They differed — tooltip "Đổi giao
         diện sáng/tối", name "Giao diện tối" — and a name that does not contain
         its own visible label is a control a voice user cannot ask for by the
         only words they can see (WCAG 2.5.3). */
      aria-label={T.themeToggle}
      aria-pressed={dark}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2m0 15v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2.5 12h2m15 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
        </svg>
      )}
    </button>
  );
}
