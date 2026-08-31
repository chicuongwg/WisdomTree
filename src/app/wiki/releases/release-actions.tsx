"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { T, translateApiError } from "@/lib/vi";

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
      const body = (await response.json()) as {
        valid?: boolean;
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      };
      if (!response.ok) {
        throw new Error(translateApiError(body.code, body.details, body.message));
      }
      setMessage(body.valid === false ? "Bản phát hành không khớp." : "Hoàn tất.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : T.genericError);
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
