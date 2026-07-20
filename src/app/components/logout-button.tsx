"use client";

import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function LogoutButton() {
  const router = useRouter();
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
          if (await m.run("/api/auth/logout")) router.push("/login");
        }}
      >
        {m.busy ? T.loading : T.signOut}
      </button>
    </>
  );
}
