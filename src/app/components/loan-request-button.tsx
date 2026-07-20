"use client";

import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function LoanRequestButton({ itemId, disabled }: { itemId: string; disabled: boolean }) {
  // One `message` state used to carry both answers and both were painted in
  // .error-text — a granted request announced itself in the colour the app
  // reserves for refusal. useMutation keeps them apart; <Say> colours and
  // announces each one for what it is.
  const m = useMutation();

  return (
    <div>
      <SayMutation m={m} />
      <button
        onClick={() =>
          void m.run(`/api/catalog/${itemId}/loan/request`, {
            // TODO(vi): move to src/lib/vi.ts
            ok: "Đã gửi yêu cầu mượn. Vui lòng chờ thủ thư duyệt.",
          })
        }
        disabled={disabled || m.busy}
      >
        {m.busy ? T.loading : T.requestLoan}
      </button>
    </div>
  );
}
