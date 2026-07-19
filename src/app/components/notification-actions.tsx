"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markRead() {
    setBusy(true);
    await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="secondary" onClick={markRead} disabled={busy}>
      {busy ? T.loading : T.markRead}
    </button>
  );
}
