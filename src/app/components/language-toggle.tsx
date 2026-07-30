"use client";

import { useRouter } from "next/navigation";
import { shellCopy, type ShellLocale } from "@/lib/shell-locale";

export function LanguageToggle({ locale }: { locale: ShellLocale }) {
  const router = useRouter();
  const copy = shellCopy(locale);

  function toggle() {
    const next = locale === "vi" ? "en" : "vi";
    document.cookie = `wt-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <button type="button" className="sb-item" onClick={toggle}>
      {copy.switchLanguage}
    </button>
  );
}
