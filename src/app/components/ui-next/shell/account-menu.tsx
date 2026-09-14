"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { translate } from "../localization";
import { Button } from "../primitives/button";
import { AppearanceToggle } from "./appearance-toggle";

export function AccountMenu({
  displayName,
  locale,
  supportedLocales,
}: {
  displayName: string;
  locale: UiLocale;
  supportedLocales: UiLocale[];
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        menuRef.current
      ) {
        menuRef.current.open = false;
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const [pendingLocale, setPendingLocale] = useState(false);
  const [localeFailed, setLocaleFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  return (
    <details
      ref={menuRef}
      className="ui-next-account-menu relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className="ui-next-account-menu__trigger min-h-[2.5rem] flex items-center gap-2 rounded px-2 py-1 cursor-pointer list-none hover:bg-ui-surface-sunken"
        aria-label={translate(locale, "shell.account")}
      >
        <span
          className="ui-next-account-menu__avatar size-8 inline-grid place-items-center rounded-full bg-ui-neutral-bg text-ui-text font-bold text-sm"
          aria-hidden="true"
        >
          {displayName.slice(0, 1).toLocaleUpperCase(locale)}
        </span>
        <span className="ui-next-account-menu__name max-w-[11rem] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium max-xs:hidden">
          {displayName}
        </span>
      </summary>
      <div className="ui-next-account-menu__panel max-h-[calc(100dvh-5rem)] overflow-y-auto absolute top-[calc(100%+0.5rem)] right-0 z-20 w-[min(20rem,calc(100vw-2rem))] grid gap-4 border border-ui-border rounded-lg p-4 bg-ui-surface-raised shadow-lg">
        <strong className="ui-next-account-menu__identity text-sm font-bold border-b border-ui-border pb-3">
          {displayName}
        </strong>
        <label
          className="ui-next-account-menu__preference grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-3"
          htmlFor="ui-next-shell-locale"
        >
          <span className="ui-next-field__label min-w-[5.5rem] text-sm text-ui-text-secondary">
            {translate(locale, "shell.locale")}
          </span>
          <select
            id="ui-next-shell-locale"
            className="ui-next-control"
            value={locale}
            disabled={pendingLocale}
            onChange={async (event) => {
              const next = event.target.value as UiLocale;
              setPendingLocale(true);
              setLocaleFailed(false);
              try {
                const response = await fetch("/api/app/locale", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ locale: next }),
                });
                if (!response.ok) throw new Error("locale");
                document.documentElement.lang = next;
                router.refresh();
              } catch {
                setLocaleFailed(true);
              } finally {
                setPendingLocale(false);
              }
            }}
          >
            {supportedLocales.map((value) => (
              <option key={value} value={value}>
                {value === "vi" ? "Tiếng Việt" : "English"}
              </option>
            ))}
          </select>
          {localeFailed ? (
            <span
              className="ui-next-field__error col-span-full text-xs text-ui-danger"
              role="alert"
            >
              {translate(locale, "shell.localeFailed")}
            </span>
          ) : null}
        </label>
        <label className="ui-next-account-menu__preference grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-3">
          <span className="min-w-[5.5rem] text-sm text-ui-text-secondary">
            {translate(locale, "shell.appearance")}
          </span>
          <AppearanceToggle locale={locale} />
        </label>
        <Link
          href="/app/account"
          className="ui-next-account-menu__link flex items-center min-h-[2.75rem] px-3 border border-ui-border rounded text-ui-accent underline-offset-[0.18em] no-underline hover:underline hover:bg-ui-surface-sunken"
          onClick={() => {
            if (menuRef.current) menuRef.current.open = false;
          }}
        >
          {translate(locale, "shell.account")}
        </Link>
        <div className="ui-next-account-menu__footer border-t border-ui-border pt-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              setSignOutFailed(false);
              try {
                const response = await fetch("/api/auth/logout", { method: "POST" });
                if (!response.ok) throw new Error("logout");
                window.location.assign("/login");
              } catch {
                setSigningOut(false);
                setSignOutFailed(true);
              }
            }}
          >
            {translate(locale, signingOut ? "shell.signingOut" : "shell.signOut")}
          </Button>
          {signOutFailed ? (
            <span className="ui-next-field__error text-xs text-ui-danger" role="alert">
              {translate(locale, "shell.signOutFailed")}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
