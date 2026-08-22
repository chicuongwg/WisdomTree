// Line-based diff for Markdown notes: LCS over lines, rendered as one unified
// stream. Small on purpose — no token-level merging, no external dependency.

export type DiffOp = { kind: "same" | "add" | "del"; text: string };

// Past this many lines the O(n·m) LCS table stops being worth it for a note;
// fall back to "everything changed", which is still a truthful diff.
const MAX_LCS_LINES = 3000;

export function diffLines(before: string, after: string): DiffOp[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length > MAX_LCS_LINES || b.length > MAX_LCS_LINES) {
    return [
      ...a.map((text): DiffOp => ({ kind: "del", text })),
      ...b.map((text): DiffOp => ({ kind: "add", text })),
    ];
  }
  // lcs[i][j] = LCS length of a[i..] vs b[j..]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: "del", text: a[i] });
      i++;
    } else {
      ops.push({ kind: "add", text: b[j] });
      j++;
    }
  }
  while (i < a.length) ops.push({ kind: "del", text: a[i++] });
  while (j < b.length) ops.push({ kind: "add", text: b[j++] });
  return ops;
}

/** True when the two texts differ at all (cheap pre-check for callers). */
export function hasChanges(before: string, after: string): boolean {
  return before !== after;
}
