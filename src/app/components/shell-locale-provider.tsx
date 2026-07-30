"use client";

import { createContext, useContext, type ReactNode } from "react";
import { shellCopy, type ShellLocale } from "@/lib/shell-locale";

const ShellLocaleContext = createContext<ShellLocale>("vi");

export function ShellLocaleProvider({
  locale,
  children,
}: {
  locale: ShellLocale;
  children: ReactNode;
}) {
  return <ShellLocaleContext.Provider value={locale}>{children}</ShellLocaleContext.Provider>;
}

export function useShellCopy() {
  return shellCopy(useContext(ShellLocaleContext));
}
