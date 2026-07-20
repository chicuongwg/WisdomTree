"use client";

import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function LogoutButton() {
  const m = useMutation();
  return (
    <>
      <SayMutation m={m} />
      {/* Disabled across the round trip: a double click used to fire two
          logout POSTs and two navigations. */}
      <button
        className="secondary"
        disabled={m.busy}
        onClick={async () => {
          // A hard navigation, not router.push: the App Router caches the root
          // layout, so a client-side hop to /login kept the signed-in shell —
          // rail, sidebar, the old name in the status bar — wrapped around the
          // login screen. Leaving a session is the one navigation that must
          // drop every piece of signed-in state, so it reloads from zero.
          if (await m.run("/api/auth/logout")) window.location.assign("/login");
        }}
      >
        {m.busy ? T.loading : T.signOut}
      </button>
    </>
  );
}
