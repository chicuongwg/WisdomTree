"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function TranslationDecision({ proposalId, disabled }: { proposalId: string; disabled: boolean }) {
  const router = useRouter();
  const mutation = useMutation();
  const [note, setNote] = useState("");
  async function decide(decision: "approved" | "rejected" | "changes_requested") {
    if (await mutation.run(`/api/tree/translation-proposals/${proposalId}/decision`, { body: { decision, note } })) {
      router.push("/review");
      router.refresh();
    }
  }
  return (
    <div className="panel">
      <SayMutation m={mutation} />
      <div className="field"><label htmlFor="translation-note">Ghi chú quyết định</label><textarea id="translation-note" value={note} onChange={(event) => setNote(event.target.value)} /></div>
      <div className="button-row">
        <button disabled={disabled || mutation.busy} onClick={() => void decide("approved")}>Duyệt bản English</button>
        <button className="secondary" disabled={disabled || mutation.busy} onClick={() => void decide("changes_requested")}>Yêu cầu sửa</button>
        <button className="danger" disabled={disabled || mutation.busy} onClick={() => void decide("rejected")}>Từ chối</button>
      </div>
    </div>
  );
}
