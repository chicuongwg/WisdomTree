"use client";

import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

export function RestoreDraftButton({ nodeId, seq }: { nodeId: string; seq: number }) {
  const router = useRouter();
  const mutation = useMutation();

  return (
    <>
      <SayMutation m={mutation} />
      <ConfirmButton
        disabled={mutation.busy}
        label={mutation.busy ? T.loading : `Tạo draft từ v${seq}`}
        title={`Tạo draft từ phiên bản ${seq}?`}
        body="Bản chính thức sẽ không thay đổi. Nội dung này được đưa vào bản nháp riêng của bạn."
        confirmLabel="Tạo draft"
        onConfirm={() =>
          void mutation
            .run(`/api/tree/nodes/${nodeId}/versions/${seq}/restore-draft`, { method: "POST" })
            .then((saved) => {
              if (saved) router.push(`/tree/node/${nodeId}/edit`);
            })
        }
      />
    </>
  );
}
