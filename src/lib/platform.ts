"use client";

import { useSyncExternalStore } from "react";

/**
 * The modifier key this machine actually has.
 *
 * The palette has always LISTENED for either (`e.ctrlKey || e.metaKey`), but
 * the hint beside the search box printed "Ctrl K" to everyone — including the
 * readers whose keyboard has no key by that name where the hint says it is.
 * A shortcut hint that names the wrong key is worse than no hint: it teaches
 * the reader that the app's advice does not apply to them.
 *
 * Server-side and in the HTML it says Ctrl, the honest majority answer, and it
 * corrects itself on a Mac without a hydration mismatch — useSyncExternalStore
 * has a server snapshot for exactly this.
 */
const isMac = () =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

// Nothing to subscribe to: a keyboard does not change under the reader.
const noSubscribe = () => () => {};

export function useShortcutKey(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => (isMac() ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}
