"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { userRoleLabel, T } from "@/lib/vi";
import { Say } from "@/app/components/say";

export function LoginPicker({
  users,
}: {
  users: Array<{ id: string; displayName: string; role: string }>;
}) {
  const router = useRouter();
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
    router.push("/");
    router.refresh();
  }

  // Fragment, not a wrapper div: the panel spaces its own children, and the
  // scroller has to be the panel's direct child to bleed to its edges.
  return (
    <>
      <Say error={error} />
      <div className="record-scroll">
        <table className="list">
          {/* A picker, not a report: three cells that read left to right as one
              sentence. A header row would name what is already obvious and add
              a row of chrome to a six-row list. */}
          <caption className="sr-only">{T.loginPickerCaption}</caption>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>
                  <span className="badge muted">{userRoleLabel(u.role)}</span>
                </td>
                <td>
                  <button disabled={pendingId !== null} onClick={() => signIn(u.id)}>
                    {pendingId === u.id ? T.signingIn : T.signIn}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
