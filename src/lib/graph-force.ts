// A small force simulation for the knowledge map. No dependency: this is a
// deliberately plain velocity-Verlet loop so the graph can settle into a
// readable shape without pulling d3-force (or anything else) into the bundle.
//
// Three forces, all scaled by `alpha` so the system cools to a stop:
//   - repel   : every pair pushes apart (approximate n², capped by SIM_NODE_CAP)
//   - link    : each edge is a spring that wants to be TUNE.distance long
//   - centre  : a weak pull toward the canvas centre so nothing drifts away
//
// The simulation NEVER seeds from random. Callers pass the deterministic
// server-rendered positions from graph-layout.ts, so the first painted frame
// and the first simulated frame are the same picture.

import { CANVAS } from "./graph-layout";

/** Above this many nodes we stop simulating and fall back to the static layout. */
export const SIM_NODE_CAP = 300;

/** The loop stops once alpha drops below this — an idle tab then burns no CPU. */
const ALPHA_MIN = 0.01;

const ALPHA_DECAY = 0.976;
/** Velocity retained per tick (d3 calls the complement "velocityDecay"). */
const VELOCITY_KEEP = 0.62;
/** Hard cap on per-tick displacement, so a dense cluster cannot explode. */
const MAX_SPEED = 28;
const PAD = 48;

/**
 * The tuned strengths. These were once four sliders; the map ships the values
 * they were always left at instead, because "how hard do the dots push each
 * other" is a physics question this product's readers should never be asked.
 */
const TUNE = {
  /** pull toward the canvas centre, so nothing drifts off the map */
  centre: 0.033,
  /** pairwise repulsion */
  repel: 1280,
  /** spring stiffness per edge */
  link: 0.36,
  /** the length each edge wants to be, in canvas units */
  distance: 110,
};

export type SimNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Dragged nodes and the local-map centre hold their place. */
  pinned: boolean;
};

export type Simulation = {
  nodes: SimNode[];
  /** Advance one frame. Returns false once the simulation has settled. */
  tick(): boolean;
  /** Nudge back to life after a drag or a filter change. */
  reheat(to?: number): void;
};

export function createSimulation(
  seed: Array<{ id: string; x: number; y: number; pinned?: boolean }>,
  edges: Array<{ from: string; to: string }>,
): Simulation {
  const nodes: SimNode[] = seed.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    vx: 0,
    vy: 0,
    pinned: n.pinned ?? false,
  }));
  const index = new Map(nodes.map((n, i) => [n.id, i]));

  const links: Array<{ source: number; target: number }> = [];
  const degree = new Array<number>(nodes.length).fill(0);
  for (const e of edges) {
    const source = index.get(e.from);
    const target = index.get(e.to);
    if (source === undefined || target === undefined || source === target) continue;
    links.push({ source, target });
    degree[source] += 1;
    degree[target] += 1;
  }

  let alpha = 1;
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;

  function tick(): boolean {
    if (alpha < ALPHA_MIN) return false;
    const n = nodes.length;

    // Repulsion — every pair. n² is honest at this scale and SIM_NODE_CAP
    // keeps the worst case bounded (300² / 2 = 45k pair tests per frame).
    const k = TUNE.repel * alpha;
    if (k > 0) {
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            // Coincident nodes: deterministic tiny offset, never Math.random,
            // so two runs of the same graph still agree.
            dx = ((i % 7) - 3) * 0.5 || 0.5;
            dy = ((j % 5) - 2) * 0.5 || 0.5;
            d2 = dx * dx + dy * dy;
          }
          const d = Math.sqrt(d2);
          const f = k / d2;
          const ux = (dx / d) * f;
          const uy = (dy / d) * f;
          a.vx -= ux;
          a.vy -= uy;
          b.vx += ux;
          b.vy += uy;
        }
      }
    }

    // Springs. Bias by degree so a hub moves less than its leaf, which is what
    // makes a hub read as a hub instead of being flung around by its own edges.
    for (const l of links) {
      const a = nodes[l.source];
      const b = nodes[l.target];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const pull = ((d - TUNE.distance) / d) * TUNE.link * alpha;
      const total = degree[l.source] + degree[l.target] || 1;
      const biasA = degree[l.target] / total;
      const biasB = degree[l.source] / total;
      a.vx += dx * pull * biasA;
      a.vy += dy * pull * biasA;
      b.vx -= dx * pull * biasB;
      b.vy -= dy * pull * biasB;
    }

    // Centring, plus integration.
    const c = TUNE.centre * alpha;
    for (const p of nodes) {
      if (p.pinned) {
        p.vx = 0;
        p.vy = 0;
        continue;
      }
      p.vx += (cx - p.x) * c;
      p.vy += (cy - p.y) * c;
      p.vx *= VELOCITY_KEEP;
      p.vy *= VELOCITY_KEEP;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      }
      p.x = Math.max(PAD, Math.min(CANVAS.width - PAD, p.x + p.vx));
      p.y = Math.max(PAD, Math.min(CANVAS.height - PAD, p.y + p.vy));
    }

    alpha *= ALPHA_DECAY;
    return alpha >= ALPHA_MIN;
  }

  return {
    nodes,
    tick,
    reheat(to = 0.7) {
      alpha = Math.max(alpha, to);
    },
  };
}
