"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [pendingLocale, setPendingLocale] = useState(false);
  const [localeFailed, setLocaleFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  return (
    <details className="ui-next-account-menu">
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
        <strong>{displayName}</strong>
        <label className="ui-next-field" htmlFor="ui-next-shell-locale">
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
        <div className="ui-next-account-menu__row">
          <span>{translate(locale, "shell.appearance")}</span>
          <AppearanceToggle locale={locale} />
        </div>
        <Link href="/account" className="ui-next-account-menu__link">
          {translate(locale, "shell.account")}
        </Link>
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
    </details>
  );
}
