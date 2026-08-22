"use client";

import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { SayMutation } from "./say";

/**
 * Restore an old version by APPENDING it as the newest one — history is never
 * rewritten (the tree_node_versions append-only trigger would refuse anyway).
 */
export function RevertNodeButton({
  nodeId,
  seq,
  contentMd,
  expectedVersion,
}: {
  nodeId: string;
  seq: number;
  contentMd: string;
  expectedVersion: number;
}) {
  const router = useRouter();
  const m = useMutation();

  return (
    <>
      <SayMutation m={m} />
      <ConfirmButton
        disabled={m.busy}
        label={m.busy ? T.loading : T.restoreVersion(seq)}
        title={T.restoreVersionTitle(seq)}
        body={T.restoreVersionBody}
        confirmLabel={T.save}
        onConfirm={() =>
          void m
            .run(`/api/tree/nodes/${nodeId}`, {
              method: "PATCH",
              body: { contentMd, expectedVersion },
            })
            .then((saved) => {
              if (saved) router.push(`/tree/node/${nodeId}`);
            })
        }
      />
    </>
  );
}
