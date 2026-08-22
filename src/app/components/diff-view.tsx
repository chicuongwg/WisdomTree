import { diffLines } from "@/lib/diff";
import { T } from "@/lib/vi";

/**
 * Unified line diff. Pure — usable from server pages and client components
 * (the conflict view in the editor). Context lines around changes are kept;
 * long unchanged stretches collapse to a count so a one-line edit in a long
 * note reads as one line, not the whole note.
 */
export function DiffView({ before, after }: { before: string; after: string }) {
  const ops = diffLines(before, after);
  const CONTEXT = 2;
  // Mark which "same" lines are close enough to a change to stay visible.
  const keep = ops.map((op) => op.kind !== "same");
  for (let idx = 0; idx < ops.length; idx++) {
    if (ops[idx].kind === "same") continue;
    for (let c = Math.max(0, idx - CONTEXT); c <= Math.min(ops.length - 1, idx + CONTEXT); c++) {
      keep[c] = true;
    }
  }
  const rows: Array<{ key: number; kind: "same" | "add" | "del" | "skip"; text: string }> = [];
  let skipped = 0;
  ops.forEach((op, idx) => {
    if (keep[idx]) {
      if (skipped > 0) {
        rows.push({ key: rows.length, kind: "skip", text: T.diffUnchanged(skipped) });
        skipped = 0;
      }
      rows.push({ key: rows.length, kind: op.kind, text: op.text });
    } else {
      skipped++;
    }
  });
  if (skipped > 0) {
    rows.push({ key: rows.length, kind: "skip", text: T.diffUnchanged(skipped) });
  }

  return (
    <div className="diff-view" role="figure" aria-label={T.diffAriaLabel}>
      {rows.map((row) => (
        <div key={row.key} className={`diff-line diff-${row.kind}`}>
          <span className="diff-sign" aria-hidden="true">
            {row.kind === "add" ? "+" : row.kind === "del" ? "−" : " "}
          </span>
          {/* A blank line still needs height. */}
          <span className="diff-text">{row.text || " "}</span>
        </div>
      ))}
    </div>
  );
}
