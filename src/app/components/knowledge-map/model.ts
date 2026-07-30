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

/** Pointer travel before a press becomes a drag rather than a click. */
export const DRAG_THRESHOLD = 4;
export const ZOOM_LIMIT = { min: 0.35, max: 4 };

/** Label geometry. Pairs with the `.g-label` rule in globals.css, which owns
 *  everything else about a label (font, size, anchor, colour). */
export const LABEL_MAX = 26;
export const LABEL_CUT = 25;
export const LABEL_DY = 16;
/** Rough advance width of one label character at the .g-label size, for framing. */
export const LABEL_EM = 5.6;
/**
 * Zoom at or above which every mark shows its title. Chosen against what
 * fit-to-frame actually produces: a handful of pages frames at k≈1.4 and shows
 * every title, while twenty frames at k≈0.9 and steps down to landmarks only,
 * because at that size twenty titles overlap each other into a grey smear.
 * Zooming in brings the rest back.
 */
export const LABEL_ZOOM_ALL = 1.2;
/** Below that, only the marks with links left to show — the shape's landmarks. */
export const LABEL_ZOOM_HUBS = 0.6;
/** A mark needs this many links to count as a landmark. */
export const HUB_DEGREE = 2;

// ---- what each slider means, in real units ------------------------------
//
// Every range below is written so that scale(0.5, min, max) is exactly the
// value this map shipped with, which is what makes "middle is the default"
// true rather than approximately true. The ends were chosen to be usefully
// different from each other without ever producing a map that cannot be read.
//
// The two label thresholds run BACKWARDS (min > max) on purpose: the reader's
// slider goes left "fewer titles" → right "every title", while the thing it
// controls is the zoom at which titles appear, which has to fall as the slider
// rises. At position 1 both thresholds are 0, so every title is on at any
// zoom; at position 0 you get landmarks at k≥1.2 and the rest at k≥2.4, i.e.
// the shape of the map first and the words only when you go looking.
export const FADE_ALL_RANGE = [LABEL_ZOOM_ALL * 2, 0] as const;
export const FADE_HUBS_RANGE = [LABEL_ZOOM_HUBS * 2, 0] as const;
/** Drawn-radius multiplier. Kept inside ±40% so the largest marks still clear
 *  each other under the simulation's fixed collision gap (TUNE.collide = 16). */
export const NODE_SCALE_RANGE = [0.6, 1.4] as const;
/** Edge stroke width in canvas units; 1.4 is the shipped hairline. */
export const EDGE_WIDTH_RANGE = [0.4, 2.4] as const;
/**
 * Centre pull. 0 is safe — the simulation also re-centres by translation, so
 * nothing drifts off the canvas even with the spring switched off — and the
 * top end stays far below the 0.033 that graph-force.ts records as having
 * crushed every graph into a clump.
 *
 * ponytail: a linear range with the shipped value at its midpoint can only
 * ever reach 2× that value, and 2× a deliberately weak leash measures as about
 * a 2% change in mean edge length. It is the least useful of the four sliders
 * and it is here because the reader asked for Obsidian's panel. If someone
 * reports that it does nothing, give this one a geometric mapping (0.25×…4×
 * of TUNE.centre) instead of a linear one.
 */
export const CENTRE_RANGE = [0, 0.007] as const;
/** Pairwise repulsion. Below ~800 the collision pass alone holds marks apart;
 *  above ~6000 the graph presses against the canvas padding and stops opening. */
export const REPEL_RANGE = [800, 6000] as const;
/** Spring stiffness. Kept under 1 so a spring can never overshoot its own
 *  rest length and set the map ringing. The odd-looking ends are the widest
 *  pair whose midpoint is EXACTLY 0.42 in floating point — 0.08…0.76 gives
 *  0.42000000000000004, and "the middle is the shipped default" should be
 *  true bit for bit, not to fifteen decimal places. */
export const LINK_FORCE_RANGE = [0.06, 0.78] as const;
/** Rest length of an edge, in canvas units, against a 1000×640 canvas. */
export const LINK_DISTANCE_RANGE = [44, 220] as const;

export type XY = { x: number; y: number };
export type ViewTransform = { k: number; tx: number; ty: number };

/** sqrt keeps a hub from swamping the map: 16 links is twice the radius of 4. */
export function markRadius(base: number, degree: number): number {
  return base + Math.min(9, Math.sqrt(degree) * 2.2);
}

/**
 * Every mark shares one set of handlers and reads its own id back off the
 * element. Allocating a closure per node per listener made a hover over a
 * 300-mark map rebuild 1500 functions to change one class name.
 */
export function nodeId(e: { currentTarget: SVGGElement }): string {
  return e.currentTarget.dataset.id ?? "";
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
