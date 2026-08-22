import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, parseSettings, scale, SLIDER_KEYS } from "@/lib/graph-settings";
import {
  CENTRE_RANGE,
  degreeOf,
  EDGE_WIDTH_RANGE,
  FADE_ALL_RANGE,
  FADE_HUBS_RANGE,
  groupFor,
  LABEL_ZOOM_ALL,
  LABEL_ZOOM_HUBS,
  LINK_DISTANCE_RANGE,
  LINK_FORCE_RANGE,
  LINK_PROFILE,
  markRadius,
  NODE_SCALE_RANGE,
  REPEL_RANGE,
} from "@/app/components/knowledge-map/model";

export const run = async () => {
  // scale(): linear, clamped at both ends.
  assert.equal(scale(0.5, 0, 10), 5);
  assert.equal(scale(-1, 0, 10), 0);
  assert.equal(scale(2, 0, 10), 10);
  // Reversed ranges (the label thresholds) still clamp correctly.
  assert.equal(scale(0, ...FADE_ALL_RANGE), LABEL_ZOOM_ALL * 2);
  assert.equal(scale(1, ...FADE_ALL_RANGE), 0);

  // "Middle is the shipped default" — every slider at 0.5 must land on the
  // value the map ships with. The physics defaults are the d3 units the
  // force-graph engine consumes.
  assert.equal(scale(0.5, ...FADE_ALL_RANGE), LABEL_ZOOM_ALL);
  assert.equal(scale(0.5, ...FADE_HUBS_RANGE), LABEL_ZOOM_HUBS);
  assert.equal(scale(0.5, ...NODE_SCALE_RANGE), 1);
  assert.equal(scale(0.5, ...EDGE_WIDTH_RANGE), 1.4);
  assert.equal(scale(0.5, ...CENTRE_RANGE), 0.06);
  assert.equal(scale(0.5, ...REPEL_RANGE), 60);
  assert.equal(scale(0.5, ...LINK_FORCE_RANGE), 0.42);
  assert.equal(scale(0.5, ...LINK_DISTANCE_RANGE), 80);
  for (const key of SLIDER_KEYS) assert.equal(DEFAULT_SETTINGS[key], 0.5);

  // Link profile: structure binds tightest and shortest, contrast loosest and
  // longest — the ordering is the product decision, the numbers may retune.
  assert.ok(LINK_PROFILE.part_of.strength > LINK_PROFILE.supports.strength);
  assert.ok(LINK_PROFILE.supports.strength > LINK_PROFILE.related.strength);
  assert.ok(LINK_PROFILE.related.strength > LINK_PROFILE.contrasts.strength);
  assert.ok(LINK_PROFILE.part_of.distance < LINK_PROFILE.supports.distance);
  assert.ok(LINK_PROFILE.related.distance < LINK_PROFILE.contrasts.distance);

  // degreeOf counts both ends; markRadius grows sub-linearly and caps.
  const degree = degreeOf([
    { from: "a", to: "b" },
    { from: "a", to: "c" },
  ]);
  assert.equal(degree.a, 2);
  assert.equal(degree.b, 1);
  assert.equal(markRadius(8, 0), 8);
  assert.ok(markRadius(8, 4) > markRadius(8, 1));
  assert.equal(markRadius(8, 10_000), 17); // capped at base + 9

  // groupFor: tag:/branch: exact (vi-folded), plain query = title substring.
  const node = {
    id: "n1",
    title: "Lễ hội đình làng",
    branchId: "b1",
    branchName: "Văn hóa",
    verification: "verified",
    tags: ["lễ hội"],
  };
  const groups = [
    { id: "g1", name: "tags", query: "tag:LỄ HỘI", color: "#111111" },
    { id: "g2", name: "branch", query: "branch:văn hóa", color: "#222222" },
    { id: "g3", name: "text", query: "đình", color: "#333333" },
  ];
  assert.equal(groupFor(node, groups)?.id, "g1");
  assert.equal(groupFor(node, [groups[1]])?.id, "g2");
  assert.equal(groupFor(node, [groups[2]])?.id, "g3");
  assert.equal(groupFor(node, [{ id: "x", name: "", query: "tag:khác", color: "#4444" }]), undefined);

  // parseSettings degrades garbage to defaults without throwing.
  assert.deepEqual(parseSettings("not json"), DEFAULT_SETTINGS);
  assert.equal(parseSettings(JSON.stringify({ repelForce: 0.9 })).repelForce, 0.9);
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
