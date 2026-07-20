// Deterministic layout for the knowledge map. No physics loop, no
// dependencies, no randomness: the same graph always lands in the same place,
// which means the server-rendered SVG and the client hydration agree and a
// reader can build a spatial memory of the map between visits.
//
// Concept: a "chòm" (constellation) per branch. Branch centres sit on one
// ring around the canvas centre; a branch's pages sit on a smaller ring
// around their branch centre, ordered by degree so the most-linked pages of
// a branch face the middle of the map where their edges are shortest.

export type LayoutInput = {
  id: string;
  branchId: string;
};

export type Placed = { id: string; x: number; y: number };

export const CANVAS = { width: 1000, height: 640 };

function ringRadius(count: number): number {
  if (count <= 1) return 0;
  return Math.min(150, 34 + count * 11);
}

/**
 * Every ring below is rotated by this. Without it a ring of two lands on
 * cos(-π/2) and cos(+π/2) — both exactly zero — so two branches of two pages
 * seeded every node onto the same x. The simulation could then never separate
 * them: repulsion works on dx, centring works on (cx - x), and both are zero
 * for the whole column, so the map stayed a vertical line forever. An angle
 * that is not a rational fraction of 2π cannot line a ring up with an axis;
 * the golden angle is the usual choice and keeps the layout deterministic.
 */
const TILT = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.3999 rad

/**
 * Branch-constellation layout. `degree` (link count per node) only orders
 * nodes inside their ring — it never moves them off it, so adding a link
 * cannot scramble the map.
 */
export function branchLayout(
  nodes: LayoutInput[],
  degree: Record<string, number> = {},
): Record<string, Placed> {
  const byBranch = new Map<string, LayoutInput[]>();
  for (const node of nodes) {
    const list = byBranch.get(node.branchId) ?? [];
    list.push(node);
    byBranch.set(node.branchId, list);
  }
  const branchIds = [...byBranch.keys()].sort();
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;
  const spread = branchIds.length <= 1 ? 0 : Math.min(210, 90 + branchIds.length * 26);

  const placed: Record<string, Placed> = {};
  branchIds.forEach((branchId, bi) => {
    const angle = (2 * Math.PI * bi) / Math.max(1, branchIds.length) + TILT;
    const bx = cx + spread * Math.cos(angle);
    const by = cy + spread * Math.sin(angle) * 0.72; // the canvas is wider than tall
    const members = [...(byBranch.get(branchId) ?? [])].sort(
      (a, b) => (degree[b.id] ?? 0) - (degree[a.id] ?? 0) || a.id.localeCompare(b.id),
    );
    const r = ringRadius(members.length);
    members.forEach((node, i) => {
      if (members.length === 1) {
        placed[node.id] = { id: node.id, x: bx, y: by };
        return;
      }
      // start each ring facing the canvas centre so hubs read first
      const a = (2 * Math.PI * i) / members.length + angle + Math.PI + TILT;
      placed[node.id] = { id: node.id, x: bx + r * Math.cos(a), y: by + r * Math.sin(a) * 0.85 };
    });
  });
  return clampToCanvas(placed);
}

/** Local map: the focus page at the centre, its neighbours on one ring. */
export function egoLayout(nodes: LayoutInput[], centerId: string): Record<string, Placed> {
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;
  const others = nodes.filter((n) => n.id !== centerId).sort((a, b) => a.id.localeCompare(b.id));
  const placed: Record<string, Placed> = { [centerId]: { id: centerId, x: cx, y: cy } };
  const r = others.length <= 4 ? 190 : Math.min(250, 150 + others.length * 9);
  others.forEach((node, i) => {
    const a = (2 * Math.PI * i) / others.length + TILT;
    placed[node.id] = { id: node.id, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.7 };
  });
  return clampToCanvas(placed);
}

/** Keep every mark (and its label) inside the viewBox. */
function clampToCanvas(placed: Record<string, Placed>): Record<string, Placed> {
  const pad = 60;
  for (const key of Object.keys(placed)) {
    const p = placed[key];
    placed[key] = {
      ...p,
      x: Math.max(pad, Math.min(CANVAS.width - pad, p.x)),
      y: Math.max(pad, Math.min(CANVAS.height - pad - 14, p.y)),
    };
  }
  return placed;
}

export function degreeOf(edges: Array<{ from: string; to: string }>): Record<string, number> {
  const degree: Record<string, number> = {};
  for (const e of edges) {
    degree[e.from] = (degree[e.from] ?? 0) + 1;
    degree[e.to] = (degree[e.to] ?? 0) + 1;
  }
  return degree;
}
