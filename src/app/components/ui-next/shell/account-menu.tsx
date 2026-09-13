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
      className="ui-next-account-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className="ui-next-account-menu__trigger"
        aria-label={translate(locale, "shell.account")}
      >
        <span className="ui-next-account-menu__avatar" aria-hidden="true">
          {displayName.slice(0, 1).toLocaleUpperCase(locale)}
        </span>
        <span className="ui-next-account-menu__name">{displayName}</span>
      </summary>
      <div className="ui-next-account-menu__panel">
        <strong className="ui-next-account-menu__identity">{displayName}</strong>
        <label className="ui-next-account-menu__preference" htmlFor="ui-next-shell-locale">
          <span className="ui-next-field__label">{translate(locale, "shell.locale")}</span>
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
            <span className="ui-next-field__error" role="alert">
              {translate(locale, "shell.localeFailed")}
            </span>
          ) : null}
        </label>
        <label className="ui-next-account-menu__preference">
          <span>{translate(locale, "shell.appearance")}</span>
          <AppearanceToggle locale={locale} />
        </label>
        <Link
          href="/app/account"
          className="ui-next-account-menu__link"
          onClick={() => {
            if (menuRef.current) menuRef.current.open = false;
          }}
        >
          {translate(locale, "shell.account")}
        </Link>
        <div className="ui-next-account-menu__footer">
          <Button
            type="button"
            variant="ghost"
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
            <span className="ui-next-field__error" role="alert">
              {translate(locale, "shell.signOutFailed")}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
