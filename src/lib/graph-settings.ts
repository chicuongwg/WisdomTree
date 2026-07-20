// Display settings for the knowledge map — the model behind the "Hiển thị"
// panel. Kept out of the component so the shape, the defaults and the
// localStorage contract are all reviewable in one place.
//
// Persistence rule: ONE namespaced key, read in an effect and never during
// render. The server has no localStorage, so reading during render would make
// the server HTML and the first client render disagree — the settings are
// applied on the tick after mount instead, which is invisible to the reader
// and keeps hydration honest.

import { FORCE_DEFAULTS, type ForceSettings } from "./graph-force";

export const SETTINGS_KEY = "wisdomtree.graph.v1";

/** The four link types the schema actually allows (drizzle/0001, link_type CHECK). */
export const LINK_TYPES = ["related", "supports", "contrasts", "part_of"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export type ColourBy = "verification" | "branch";
export type LabelMode = "always" | "hover" | "hidden";
export type Direction = "both" | "outgoing" | "incoming";

export type GraphSettings = ForceSettings & {
  /* filters */
  /**
   * The branch filter persists but the free-text title search deliberately
   * does NOT (it lives in component state). A branch is a durable "where I
   * work"; a search box is a transient lookup, and restoring one a week later
   * would show a near-empty map with no visible reason why.
   */
  branchId: string;
  showOrphans: boolean;
  /* display */
  colourBy: ColourBy;
  sizeByLinks: boolean;
  showArrows: boolean;
  labelMode: LabelMode;
  linkTypes: Record<LinkType, boolean>;
  /* local graph only */
  depth: number;
  direction: Direction;
  /* motion */
  animate: boolean;
};

export const SETTINGS_DEFAULTS: GraphSettings = {
  ...FORCE_DEFAULTS,
  branchId: "",
  showOrphans: true,
  // Verification is the default colouring precisely because it is the axis
  // that also carries a shape, so the map never depends on colour alone.
  colourBy: "verification",
  sizeByLinks: true,
  showArrows: false,
  labelMode: "always",
  linkTypes: { related: true, supports: true, contrasts: true, part_of: true },
  depth: 1,
  direction: "both",
  animate: true,
};

export const DEPTH_RANGE = { min: 1, max: 3 } as const;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * A fresh copy every time. Handing out the shared SETTINGS_DEFAULTS object
 * would let one caller's mutation redefine "default" for the rest of the
 * session — including `linkTypes`, which is nested and so survives a spread.
 */
export function defaultSettings(): GraphSettings {
  return { ...SETTINGS_DEFAULTS, linkTypes: { ...SETTINGS_DEFAULTS.linkTypes } };
}

/**
 * Rebuild a settings object from whatever localStorage happens to hold.
 * Every field is validated: a stale key from an older build, or a value a
 * reader hand-edited, degrades to the default instead of breaking the map.
 */
export function parseSettings(raw: string | null): GraphSettings {
  if (!raw) return defaultSettings();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultSettings();
  }
  if (typeof data !== "object" || data === null) return defaultSettings();
  const d = data as Record<string, unknown>;
  const storedTypes = (d.linkTypes ?? {}) as Record<string, unknown>;
  const linkTypes = {} as Record<LinkType, boolean>;
  for (const t of LINK_TYPES) linkTypes[t] = bool(storedTypes[t], SETTINGS_DEFAULTS.linkTypes[t]);

  return {
    centreForce: clampNumber(d.centreForce, 0, 100, SETTINGS_DEFAULTS.centreForce),
    repelForce: clampNumber(d.repelForce, 0, 100, SETTINGS_DEFAULTS.repelForce),
    linkForce: clampNumber(d.linkForce, 0, 100, SETTINGS_DEFAULTS.linkForce),
    linkDistance: clampNumber(d.linkDistance, 30, 300, SETTINGS_DEFAULTS.linkDistance),
    branchId: typeof d.branchId === "string" ? d.branchId : SETTINGS_DEFAULTS.branchId,
    showOrphans: bool(d.showOrphans, SETTINGS_DEFAULTS.showOrphans),
    colourBy: pick(d.colourBy, ["verification", "branch"], SETTINGS_DEFAULTS.colourBy),
    sizeByLinks: bool(d.sizeByLinks, SETTINGS_DEFAULTS.sizeByLinks),
    showArrows: bool(d.showArrows, SETTINGS_DEFAULTS.showArrows),
    labelMode: pick(d.labelMode, ["always", "hover", "hidden"], SETTINGS_DEFAULTS.labelMode),
    linkTypes,
    depth: clampNumber(d.depth, DEPTH_RANGE.min, DEPTH_RANGE.max, SETTINGS_DEFAULTS.depth),
    direction: pick(d.direction, ["both", "outgoing", "incoming"], SETTINGS_DEFAULTS.direction),
    animate: bool(d.animate, SETTINGS_DEFAULTS.animate),
  };
}

export function readSettings(): GraphSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    return parseSettings(window.localStorage.getItem(SETTINGS_KEY));
  } catch {
    // Private-browsing modes throw on localStorage access; defaults are fine.
    return defaultSettings();
  }
}

export function writeSettings(settings: GraphSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Quota or private mode — the map still works, it just won't remember.
  }
}

/**
 * Walk the graph out from `centerId` to `depth` hops, following links in the
 * requested direction. Returns the set of node ids to draw.
 */
export function reachable(
  centerId: string,
  edges: Array<{ from: string; to: string }>,
  depth: number,
  direction: Direction,
): Set<string> {
  const out = new Map<string, string[]>();
  const inc = new Map<string, string[]>();
  for (const e of edges) {
    (out.get(e.from) ?? out.set(e.from, []).get(e.from)!).push(e.to);
    (inc.get(e.to) ?? inc.set(e.to, []).get(e.to)!).push(e.from);
  }
  const seen = new Set([centerId]);
  let frontier = [centerId];
  for (let step = 0; step < depth; step++) {
    const next: string[] = [];
    for (const id of frontier) {
      const neighbours = [
        ...(direction !== "incoming" ? (out.get(id) ?? []) : []),
        ...(direction !== "outgoing" ? (inc.get(id) ?? []) : []),
      ];
      for (const n of neighbours) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return seen;
}
