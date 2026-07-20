import type { ReactNode } from "react";
import { T } from "@/lib/vi";

// The extracted-text reference pane. Source Detail and the assigned editor's
// task screen carried a byte-identical copy of this heading + chunk loop; only
// the sentence shown when there is nothing extracted differs, so that is the
// one thing the caller passes.

export function RawChunks({
  chunks,
  empty,
}: {
  chunks: Array<{ id: string; refLabel: string; content: string }>;
  empty: ReactNode;
}) {
  return (
    <>
      <h2>{T.rawText}</h2>
      {chunks.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        chunks.map((c) => (
          <div key={c.id} className="stack-item">
            {/* A ref label is a kind, not a state — neutral chip on purpose. */}
            <span className="badge muted">{c.refLabel}</span>
            <pre className="raw-text">{c.content}</pre>
          </div>
        ))
      )}
    </>
  );
}
