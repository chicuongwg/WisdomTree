"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

export function LoanRequestButton({ itemId, disabled }: { itemId: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function request() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/catalog/${itemId}/loan/request`, { method: "POST" });
    if (!res.ok) {
      // 409 arrives in the contract Error shape; show its Vietnamese message.
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setMessage(body?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    setMessage("Đã gửi yêu cầu mượn. Vui lòng chờ thủ thư duyệt.");
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      {message && <p className="error-text">{message}</p>}
      <button onClick={request} disabled={disabled || busy}>
        {busy ? T.loading : T.requestLoan}
      </button>
    </div>
  );
}
