"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReleaseActions({
  spaceId,
  releaseId,
  canManage,
}: {
  spaceId: string;
  releaseId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(url: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, { method: "POST" });
      const body = (await response.json()) as { valid?: boolean; message?: string };
      if (!response.ok) throw new Error(body.message || "Thao tác thất bại.");
      setMessage(body.valid === false ? "Bản phát hành không khớp." : "Hoàn tất.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Thao tác thất bại.");
    } finally {
      setBusy(false);
    }
  }

  if (!releaseId) {
    return canManage ? (
      <span>
        <button disabled={busy} onClick={() => run(`/api/spaces/${spaceId}/wiki/releases`)}>
          {busy ? "Đang tạo…" : "Tạo bản phát hành"}
        </button>{" "}
        {message && <span className="muted">{message}</span>}
      </span>
    ) : null;
  }

  return (
    <span>
      <button disabled={busy} onClick={() => run(`/api/wiki/releases/${releaseId}/verify`)}>
        Kiểm tra
      </button>{" "}
      {canManage && (
        <button disabled={busy} onClick={() => run(`/api/wiki/releases/${releaseId}/rebuild`)}>
          Khôi phục
        </button>
      )}{" "}
      {message && <span className="muted">{message}</span>}
    </span>
  );
}
