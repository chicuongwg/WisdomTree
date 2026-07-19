"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabel, T } from "@/lib/vi";

export function LoginPicker({
  users,
}: {
  users: Array<{ id: string; displayName: string; role: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(userId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      <table className="list">
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.displayName}</td>
              <td>
                <span className="badge muted">{roleLabel[u.role] ?? u.role}</span>
              </td>
              <td>
                <button disabled={busy} onClick={() => signIn(u.id)}>
                  {T.signIn}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
