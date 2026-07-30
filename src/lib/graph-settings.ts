// Display settings for the knowledge map — the model behind the map's control
// panel. Two kinds of setting live here:
//
//   FILTER  (branch, link types) — what is on the map at all.
//   DISPLAY + FORCES             — how what is on it is drawn and arranged.
//
// The second kind was cut for one release and is back by owner decision
// (2026-07-21), sized against Obsidian's panel: on a map a reader works in,
// pulling a dense cluster apart or turning labels off IS the reading move, and
// no shipped default is right for both a six-page branch and a 300-page tree.
//
// Every numeric setting is a 0..1 SLIDER POSITION, not a physics value. The
// canvas maps position → force through `scale()`. That keeps the stored shape
// stable if the physics is ever retuned, and keeps every slider looking the
// same to the reader: middle is the shipped default.
//
// Persistence rule: ONE namespaced key, read in an effect and never during
// render. The server has no localStorage, so reading during render would make
// the server HTML and the first client render disagree — the settings are
// applied on the tick after mount instead, which is invisible to the reader
// and keeps hydration honest.

export const SETTINGS_KEY = "wisdomtree.graph.v3";
const PREVIOUS_SETTINGS_KEY = "wisdomtree.graph.v2";

/** The four link types the schema actually allows (drizzle/0001, link_type CHECK). */
export const LINK_TYPES = ["related", "supports", "contrasts", "part_of"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export type GraphGroup = {
  id: string;
  name: string;
  query: string;
  color: string;
};

export type GraphSettings = {
  /**
   * The branch filter persists but the free-text title search deliberately
   * does NOT (it lives in component state). A branch is a durable "where I
   * work"; a search box is a transient lookup, and restoring one a week later
   * would show a near-empty map with no visible reason why.
   */
  branchId: string;
  tag: string;
  includeOrphans: boolean;
  localDepth: number;
  groups: GraphGroup[];
  linkTypes: Record<LinkType, boolean>;
  /** Draw an arrowhead on each edge, so a link reads as a direction. */
  arrows: boolean;
  /**
   * Zoom at which every title appears. Left = only landmarks, and titles
   * arrive as you zoom in; right = every title, always. This is Obsidian's
   * "text fade threshold" and it is the one control the owner named: a map
   * with 300 titles at once is a grey smear, not a map.
   */
  textFade: number;
  nodeSize: number;
  linkThickness: number;
  centreForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
};

/** The slider positions that reproduce the shipped map exactly. */
export const DEFAULT_SETTINGS: GraphSettings = {
  branchId: "",
  tag: "",
  includeOrphans: true,
  localDepth: 1,
  groups: [],
  linkTypes: { related: true, supports: true, contrasts: true, part_of: true },
  arrows: false,
  textFade: 0.5,
  nodeSize: 0.5,
  linkThickness: 0.5,
  centreForce: 0.5,
  repelForce: 0.5,
  linkForce: 0.5,
  linkDistance: 0.5,
};

/** Which keys are 0..1 sliders — the one list parse and the panel both use. */
export const SLIDER_KEYS = [
  "textFade",
  "nodeSize",
  "linkThickness",
  "centreForce",
  "repelForce",
  "linkForce",
  "linkDistance",
] as const;
export type SliderKey = (typeof SLIDER_KEYS)[number];

/**
 * Slider position → real value, linear between `min` and `max` with the
 * shipped default landing at 0.5. Every mapping in the app goes through this
 * one function, so "middle is default" is a property of the code and not a
 * promise seven call sites have to keep.
 */
export function scale(position: number, min: number, max: number): number {
  const p = Math.min(1, Math.max(0, position));
  return min + (max - min) * p;
}

/**
 * Rebuild a settings object from whatever localStorage happens to hold. A
 * stale key from an older build, or a value a reader hand-edited, degrades to
 * the default instead of breaking the map.
 */
export function parseSettings(raw: string | null): GraphSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
    const d = data as Record<string, unknown>;
    const stored = (d.linkTypes ?? {}) as Record<string, unknown>;
    const linkTypes = { ...DEFAULT_SETTINGS.linkTypes };
    // Only an explicit `false` hides a link type; anything else is "shown".
    for (const t of LINK_TYPES) if (stored[t] === false) linkTypes[t] = false;
    // A slider survives only as a finite number in range. A hand-edited NaN
    // would otherwise reach the physics and freeze every position at NaN.
    const sliders = {} as Record<SliderKey, number>;
    for (const k of SLIDER_KEYS) {
      const v = d[k];
      sliders[k] =
        typeof v === "number" && Number.isFinite(v)
          ? Math.min(1, Math.max(0, v))
          : DEFAULT_SETTINGS[k];
    }
    return {
      branchId: typeof d.branchId === "string" ? d.branchId : "",
      tag: typeof d.tag === "string" ? d.tag : "",
      includeOrphans: d.includeOrphans !== false,
      localDepth:
        typeof d.localDepth === "number" && Number.isFinite(d.localDepth)
          ? Math.min(5, Math.max(1, Math.round(d.localDepth)))
          : 1,
      groups: Array.isArray(d.groups)
        ? d.groups.flatMap((value) => {
            if (typeof value !== "object" || value === null) return [];
            const group = value as Record<string, unknown>;
            if (
              typeof group.id !== "string" ||
              typeof group.name !== "string" ||
              typeof group.query !== "string" ||
              typeof group.color !== "string"
            )
              return [];
            return [
              {
                id: group.id,
                name: group.name,
                query: group.query,
                color: /^#[0-9a-f]{6}$/i.test(group.color) ? group.color : "#526fa8",
              },
            ];
          })
        : [],
      linkTypes,
      arrows: d.arrows === true,
      ...sliders,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function readSettings(): GraphSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return parseSettings(
      window.localStorage.getItem(SETTINGS_KEY) ??
        window.localStorage.getItem(PREVIOUS_SETTINGS_KEY),
    );
  } catch {
    // Private-browsing modes throw on localStorage access; defaults are fine.
    return DEFAULT_SETTINGS;
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
