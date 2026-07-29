"use client";

import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

/**
 * Owner pushes their stored file toward the knowledge tree or withdraws an unpromoted nomination.
 */
export function NominateSource({
  sourceId,
  nominated,
  canRevert = true,
}: {
  sourceId: string;
  nominated: boolean;
  canRevert?: boolean;
}) {
  const m = useMutation();
  if (nominated && !canRevert && !m.ok) return null;
  return (
    <div className="panel">
      <SayMutation m={m} />
      {!nominated && (
        <button
          onClick={() =>
            void m.run(`/api/source/${sourceId}/nominate`, {
              method: "POST",
              ok: T.nominateSent,
            })
          }
          disabled={m.busy}
        >
          {m.busy ? T.loading : T.nominateCta}
        </button>
      )}
      {nominated && canRevert && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <span className="muted">{T.nominatedAwaitingAssign}</span>
          <button
            className="secondary"
            onClick={() =>
              void m.run(`/api/source/${sourceId}/nominate`, {
                method: "DELETE",
                ok: T.revertNominateSent,
              })
            }
            disabled={m.busy}
          >
            {m.busy ? T.loading : T.revertNominateCta}
          </button>
        </div>
      )}
    </div>
  );
}
