import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, LINK_TYPES, parseSettings, scale } from "@/lib/graph-settings";
import { branchLayout, CANVAS, degreeOf, egoLayout } from "@/lib/graph-layout";

export function run() {
  assert.equal(scale(-1, 10, 20), 10);
  assert.equal(scale(0.5, 10, 20), 15);
  assert.equal(scale(2, 10, 20), 20);
  assert.equal(parseSettings(null), DEFAULT_SETTINGS);
  assert.equal(parseSettings("{broken"), DEFAULT_SETTINGS);

  const parsed = parseSettings(
    JSON.stringify({
      branchId: "branch",
      localDepth: 99,
      linkTypes: { supports: false, related: "invalid" },
      centreForce: Number.NaN,
      repelForce: -2,
      groups: [{ id: "g", name: "Group", query: "tag:test", color: "not-a-colour" }, { id: 1 }],
    }),
  );
  assert.equal(parsed.branchId, "branch");
  assert.equal(parsed.localDepth, 5);
  assert.equal(parsed.linkTypes.supports, false);
  assert.equal(parsed.linkTypes.related, true);
  assert.equal(parsed.centreForce, DEFAULT_SETTINGS.centreForce);
  assert.equal(parsed.repelForce, 0);
  assert.deepEqual(parsed.groups, [
    { id: "g", name: "Group", query: "tag:test", color: "#526fa8" },
  ]);
  assert.deepEqual(Object.keys(parsed.linkTypes), [...LINK_TYPES]);

  const nodes = [
    { id: "a", branchId: "one" },
    { id: "b", branchId: "one" },
    { id: "c", branchId: "two" },
  ];
  const edges = [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ];
  const degree = degreeOf(edges);
  assert.deepEqual(degree, { a: 1, b: 2, c: 1 });
  for (const layout of [branchLayout(nodes, degree), egoLayout(nodes, "b")]) {
    assert.deepEqual(Object.keys(layout).sort(), ["a", "b", "c"]);
    for (const point of Object.values(layout)) {
      assert.ok(point.x >= 0 && point.x <= CANVAS.width);
      assert.ok(point.y >= 0 && point.y <= CANVAS.height);
    }
  }
}
