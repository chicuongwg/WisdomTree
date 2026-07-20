"use client";

import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

/**
 * Owner pushes their stored file toward the knowledge tree. Rendered even
 * after a curation exists so the success message survives the refresh that
 * hides the button; with a curation and nothing to say it renders nothing.
 */
export function NominateSource({ sourceId, nominated }: { sourceId: string; nominated: boolean }) {
  const m = useMutation();
  if (nominated && !m.ok) return null;
  return (
    <div className="panel">
      <SayMutation m={m} />
      {!nominated && (
        <button
          onClick={() =>
            void m.run(`/api/source/${sourceId}/nominate`, {
              // TODO(vi): move to src/lib/vi.ts
              ok: "Đã đề cử. Quản trị viên sẽ giao biên tập viên hiệu đính.",
            })
          }
          disabled={m.busy}
        >
          {/* TODO(vi): move to src/lib/vi.ts */}
          {m.busy ? T.loading : "Đề cử lên cây tri thức"}
        </button>
      )}
    </div>
  );
}
