"use client";

import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="secondary"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      {T.signOut}
    </button>
  );
}
