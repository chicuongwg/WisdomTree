// A small force simulation for the knowledge map. No dependency: this is a
// deliberately plain velocity-Verlet loop, ~150 lines, so the graph can move
// like Obsidian's without pulling d3-force (or anything else) into the bundle.
//
// Three forces, all scaled by `alpha` so the system cools to a stop:
//   - repel   : every pair pushes apart (approximate n², capped by SIM_NODE_CAP)
//   - link    : each edge is a spring that wants to be `linkDistance` long
//   - centre  : a weak pull toward the canvas centre so nothing drifts away
//
// The simulation NEVER seeds from random. Callers pass the deterministic
// server-rendered positions from graph-layout.ts, so the first painted frame
// and the first simulated frame are the same picture.

import { CANVAS } from "./graph-layout";

/** Above this many nodes we stop simulating and fall back to the static layout. */
export const SIM_NODE_CAP = 300;

/** The loop stops once alpha drops below this — an idle tab then burns no CPU. */
export const ALPHA_MIN = 0.01;

const ALPHA_DECAY = 0.976;
/** Velocity retained per tick (d3 calls the complement "velocityDecay"). */
const VELOCITY_KEEP = 0.62;
/** Hard cap on per-tick displacement, so a dense cluster cannot explode. */
const MAX_SPEED = 28;
const PAD = 48;

/**
 * Force settings as the UI stores them: whole numbers on a 0–100 dial, except
 * `linkDistance` which is real pixels. Keeping the stored units human-readable
 * means a localStorage blob stays legible and the sliders need no inverse math.
 */
export type ForceSettings = {
  centreForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
};

export const FORCE_DEFAULTS: ForceSettings = {
  centreForce: 30,
  repelForce: 40,
  linkForce: 40,
  linkDistance: 110,
};

export const FORCE_RANGE = {
  centreForce: { min: 0, max: 100, step: 1 },
  repelForce: { min: 0, max: 100, step: 1 },
  linkForce: { min: 0, max: 100, step: 1 },
  linkDistance: { min: 30, max: 300, step: 5 },
} as const;

export type SimNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Dragged nodes and the local-map centre hold their place. */
  pinned: boolean;
};

export type SimLink = { source: number; target: number };

/** Dial (0–100) → the strength the integrator actually uses. */
function tuning(s: ForceSettings) {
  return {
    centre: (s.centreForce / 100) * 0.11,
    repel: (s.repelForce / 100) * 3200,
    link: (s.linkForce / 100) * 0.9,
    distance: s.linkDistance,
  };
}

export type Simulation = {
  nodes: SimNode[];
  /** Read the current heat; the caller stops its rAF loop when it hits 0. */
  alpha(): number;
  /** Advance one frame. Returns false once the simulation has settled. */
  tick(): boolean;
  /** Nudge back to life after a drag, a filter change or a settings change. */
  reheat(to?: number): void;
  setSettings(next: ForceSettings): void;
  /** Run to rest without painting — used for prefers-reduced-motion. */
  settle(maxTicks?: number): void;
};

export function createSimulation(
  seed: Array<{ id: string; x: number; y: number; pinned?: boolean }>,
  edges: Array<{ from: string; to: string }>,
  settings: ForceSettings,
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

  const links: SimLink[] = [];
  const degree = new Array<number>(nodes.length).fill(0);
  for (const e of edges) {
    const source = index.get(e.from);
    const target = index.get(e.to);
    if (source === undefined || target === undefined || source === target) continue;
    links.push({ source, target });
    degree[source] += 1;
    degree[target] += 1;
  }

  let tune = tuning(settings);
  let alpha = 1;
  const cx = CANVAS.width / 2;
  const cy = CANVAS.height / 2;

  function tick(): boolean {
    if (alpha < ALPHA_MIN) return false;
    const n = nodes.length;

    // Repulsion — every pair. n² is honest at this scale and SIM_NODE_CAP
    // keeps the worst case bounded (300² / 2 = 45k pair tests per frame).
    const k = tune.repel * alpha;
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
      const pull = ((d - tune.distance) / d) * tune.link * alpha;
      const total = degree[l.source] + degree[l.target] || 1;
      const biasA = degree[l.target] / total;
      const biasB = degree[l.source] / total;
      a.vx += dx * pull * biasA;
      a.vy += dy * pull * biasA;
      b.vx -= dx * pull * biasB;
      b.vy -= dy * pull * biasB;
    }

    // Centring, plus integration.
    const c = tune.centre * alpha;
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
    alpha: () => alpha,
    tick,
    reheat(to = 0.7) {
      alpha = Math.max(alpha, to);
    },
    setSettings(next) {
      tune = tuning(next);
    },
    settle(maxTicks = 400) {
      for (let i = 0; i < maxTicks; i++) {
        if (!tick()) break;
      }
      alpha = 0;
    },
  };
}
