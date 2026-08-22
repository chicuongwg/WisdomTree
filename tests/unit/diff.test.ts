import assert from "node:assert/strict";
import { diffLines, hasChanges } from "@/lib/diff";

// The line diff behind version history, proposal review and edit conflicts.

export const run = async () => {
  // Identical input: all "same", nothing invented.
  const same = diffLines("a\nb", "a\nb");
  assert.deepEqual(
    same.map((op) => op.kind),
    ["same", "same"],
  );

  // One changed line in the middle: del+add pair, context intact.
  const mid = diffLines("a\nb\nc", "a\nX\nc");
  assert.deepEqual(
    mid.map((op) => `${op.kind}:${op.text}`),
    ["same:a", "del:b", "add:X", "same:c"],
  );

  // Pure insertion and pure deletion.
  assert.deepEqual(
    diffLines("a", "a\nb").map((op) => op.kind),
    ["same", "add"],
  );
  assert.deepEqual(
    diffLines("a\nb", "a").map((op) => op.kind),
    ["same", "del"],
  );

  // Empty sides.
  assert.deepEqual(
    diffLines("", "x").map((op) => `${op.kind}:${op.text}`),
    ["del:", "add:x"],
  );

  // The reconstruction invariant: dropping "del" lines rebuilds `after`,
  // dropping "add" lines rebuilds `before` — a diff that cannot round-trip
  // is lying about the texts.
  const before = "one\ntwo\nthree\nfour";
  const after = "one\n2\nthree\nfour\nfive";
  const ops = diffLines(before, after);
  assert.equal(
    ops
      .filter((op) => op.kind !== "del")
      .map((op) => op.text)
      .join("\n"),
    after,
  );
  assert.equal(
    ops
      .filter((op) => op.kind !== "add")
      .map((op) => op.text)
      .join("\n"),
    before,
  );

  // Oversized input falls back to del-all/add-all without hanging.
  const big = Array.from({ length: 3001 }, (_, i) => `line ${i}`).join("\n");
  const fallback = diffLines(big, big);
  assert.equal(fallback.filter((op) => op.kind === "same").length, 0);
  assert.equal(fallback.length, 3001 * 2);

  assert.equal(hasChanges("a", "a"), false);
  assert.equal(hasChanges("a", "b"), true);
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
