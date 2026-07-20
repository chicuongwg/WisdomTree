"use client";

import { useState } from "react";
import { userRoleLabel, T } from "@/lib/vi";
import { Say } from "@/app/components/say";

export function LoginPicker({
  users,
}: {
  users: Array<{ id: string; displayName: string; role: string }>;
}) {
  // The id being signed in, not a bare boolean: "đang bận" is not an answer to
  // "which of these six rows did I just press?".
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setPendingId(userId);
    setError(null);
    const res = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? T.genericError);
      setPendingId(null);
      return;
    }
    // Hard navigation, like logout: entering and leaving a session are the
    // two moments every cached layout must be thrown away.
    window.location.assign("/");
  }

  // Not a table: table.list carries a 40rem minimum for data screens, which
  // inside a portal column meant a horizontal scrollbar with the sign-in
  // button clipped off the right edge. A picker is a list of choices, so each
  // person IS the button — the whole row signs you in, nothing to scroll,
  // nothing to clip.
  return (
    <>
      <Say error={error} />
      <ul className="login-people" aria-label={T.loginPickerCaption}>
        {users.map((u) => (
          <li key={u.id}>
            <button
              type="button"
              className="login-person"
              disabled={pendingId !== null}
              onClick={() => signIn(u.id)}
            >
              <span className="login-person-name">{u.displayName}</span>
              <span className="login-person-role">
                {pendingId === u.id ? T.signingIn : userRoleLabel(u.role)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
