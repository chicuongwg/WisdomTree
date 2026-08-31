"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { T, translateApiError } from "@/lib/vi";

export function NodeProtectionAction({
  nodeId,
  reviewRequired,
}: {
  nodeId: string;
  reviewRequired: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/tree/nodes/${nodeId}/protection`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewRequired: !reviewRequired }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(translateApiError(body?.code, body?.details, body?.message));
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <p>
      <button type="button" className="secondary" disabled={busy} onClick={() => void toggle()}>
        {reviewRequired ? "Bỏ bảo vệ trang" : "Đánh dấu Protected"}
      </button>{" "}
      {error && <span className="notice">{error || T.genericError}</span>}
    </p>
  );
}
