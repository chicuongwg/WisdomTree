// Display settings for the knowledge map — the model behind the "Tùy chỉnh
// bản đồ" panel. Two things survive here, and only two: which branch to look
// at and which kinds of link to draw. Everything else the map once let a
// reader tune (forces, colouring, labels, arrows, depth, motion) is now a
// shipped decision, because this is a secondary surface for people who came
// to find a page, not to configure a physics engine.
//
// Persistence rule: ONE namespaced key, read in an effect and never during
// render. The server has no localStorage, so reading during render would make
// the server HTML and the first client render disagree — the settings are
// applied on the tick after mount instead, which is invisible to the reader
// and keeps hydration honest.

export const SETTINGS_KEY = "wisdomtree.graph.v1";

/** The four link types the schema actually allows (drizzle/0001, link_type CHECK). */
export const LINK_TYPES = ["related", "supports", "contrasts", "part_of"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export type GraphSettings = {
  /**
   * The branch filter persists but the free-text title search deliberately
   * does NOT (it lives in component state). A branch is a durable "where I
   * work"; a search box is a transient lookup, and restoring one a week later
   * would show a near-empty map with no visible reason why.
   */
  branchId: string;
  linkTypes: Record<LinkType, boolean>;
};

/** Shared, and never mutated: every setter builds a new object. */
export const DEFAULT_SETTINGS: GraphSettings = {
  branchId: "",
  linkTypes: { related: true, supports: true, contrasts: true, part_of: true },
};

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
    return { branchId: typeof d.branchId === "string" ? d.branchId : "", linkTypes };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function readSettings(): GraphSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return parseSettings(window.localStorage.getItem(SETTINGS_KEY));
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
