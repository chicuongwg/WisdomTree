import type { GraphGroup } from "@/lib/graph-settings";

export type MapNode = {
  id: string;
  title: string;
  branchId: string;
  branchName: string;
  verification: string;
  tags: string[];
};
export type MapEdge = { from: string; to: string; linkType: string };

export const SHAPE_LABEL: Record<string, string> = {
  verified: "hình tròn",
  unverified: "hình thoi",
  no_source: "hình vuông",
};

/** Link count per node id — drives mark radius and the label LOD. */
export function degreeOf(links: ReadonlyArray<{ from: string; to: string }>) {
  const degree: Record<string, number> = {};
  for (const link of links) {
    degree[link.from] = (degree[link.from] ?? 0) + 1;
    degree[link.to] = (degree[link.to] ?? 0) + 1;
  }
  return degree;
}

/**
 * Per-link-type physics profile, multiplied onto the link force/distance
 * sliders: a part_of edge binds tighter and shorter than a contrasts edge,
 * so structure clusters and contrast keeps its air.
 */
export const LINK_PROFILE = {
  part_of: { strength: 1.35, distance: 0.72 },
  supports: { strength: 1.05, distance: 0.9 },
  related: { strength: 0.78, distance: 1.05 },
  contrasts: { strength: 0.58, distance: 1.32 },
} as const;

export function linkProfile(linkType: string) {
  return LINK_PROFILE[linkType as keyof typeof LINK_PROFILE] ?? LINK_PROFILE.related;
}

/** Label geometry (canvas draw code owns font/colour via CSS tokens). */
export const LABEL_MAX = 26;
export const LABEL_CUT = 25;
export const LABEL_DY = 16;
/**
 * Zoom at or above which every mark shows its title; below it only landmarks
 * (degree >= HUB_DEGREE) keep theirs. force-graph's globalScale plays the
 * role the hand-rolled view transform's k used to.
 */
export const LABEL_ZOOM_ALL = 1.2;
export const LABEL_ZOOM_HUBS = 0.6;
export const HUB_DEGREE = 2;

// ---- what each slider means, in real units ------------------------------
//
// Every range is written so that scale(0.5, min, max) is exactly the shipped
// default — "middle is the default" is a property the unit test enforces.
// The force ranges are in d3-force units (the engine underneath force-graph).
//
// The two label thresholds run BACKWARDS (min > max) on purpose: the slider
// goes left "fewer titles" → right "every title", while the value it controls
// is the zoom at which titles appear, which has to fall as the slider rises.
export const FADE_ALL_RANGE = [LABEL_ZOOM_ALL * 2, 0] as const;
export const FADE_HUBS_RANGE = [LABEL_ZOOM_HUBS * 2, 0] as const;
/** Drawn-radius multiplier; collision follows the drawn radius. */
export const NODE_SCALE_RANGE = [0.6, 1.4] as const;
/** Edge stroke width in graph units; 1.4 is the shipped hairline. */
export const EDGE_WIDTH_RANGE = [0.4, 2.4] as const;
/** forceX/forceY pull toward the origin. 0 lets the map drift apart freely. */
export const CENTRE_RANGE = [0, 0.12] as const;
/** forceManyBody strength magnitude (applied negative). */
export const REPEL_RANGE = [0, 120] as const;
/** Link spring strength multiplier, per-link × LINK_PROFILE.strength. */
export const LINK_FORCE_RANGE = [0.06, 0.78] as const;
/** Link rest length in graph units, per-link × LINK_PROFILE.distance. */
export const LINK_DISTANCE_RANGE = [20, 140] as const;

/** sqrt keeps a hub from swamping the map: 16 links is twice the radius of 4. */
export function markRadius(base: number, degree: number): number {
  return base + Math.min(9, Math.sqrt(degree) * 2.2);
}

export function groupFor(node: MapNode, groups: GraphGroup[]): GraphGroup | undefined {
  return groups.find((group) => {
    const query = group.query.trim().toLocaleLowerCase("vi");
    if (!query) return false;
    if (query.startsWith("tag:"))
      return node.tags.some((tag) => tag.toLocaleLowerCase("vi") === query.slice(4).trim());
    if (query.startsWith("branch:"))
      return node.branchName.toLocaleLowerCase("vi") === query.slice(7).trim();
    return node.title.toLocaleLowerCase("vi").includes(query);
  });
}
