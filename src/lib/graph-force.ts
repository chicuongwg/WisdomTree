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
 * The default strengths — where the map sits for a reader who never opens the
 * panel. These were fixed constants for one release, on the argument that "how
 * hard do the dots push each other" is not a reader's question. The owner
 * asked for Obsidian's controls back (2026-07-21): on a map you are reading
 * rather than passing through, spreading a dense cluster IS the reading move.
 * So the numbers stay as the shipped default and become the slider midpoints.
 */
export const TUNE = {
  /**
   * Pull toward the canvas centre, so nothing drifts off the map. Deliberately
   * an order of magnitude weaker than it was: this force fights repulsion
   * directly, and at 0.033 it won — every graph collapsed into a small clump
   * in the middle of an empty canvas (measured: six pages filled 2.8% of it).
   * It is a leash, not a magnet.
   */
  centre: 0.0035,
  /** pairwise repulsion */
  repel: 3400,
  /** spring stiffness per edge */
  link: 0.42,
  /** the length each edge wants to be, in canvas units */
  distance: 132,
  /** clear space kept between two marks' edges, so labels have room */
  collide: 16,
};

export type SimNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Drawn radius, so two marks can refuse to overlap. */
  r: number;
  /** Dragged nodes and the local-map centre hold their place. */
  pinned: boolean;
};

export type Simulation = {
  nodes: SimNode[];
  /** Advance one frame. Returns false once the simulation has settled. */
  tick(): boolean;
  /** Nudge back to life after a drag or a filter change. */
  reheat(to?: number): void;
  /** Move a force while the loop runs. The caller reheats to see it. */
  setTuning(next: Tuning): void;
};

/** What the panel may move. Anything absent keeps its TUNE default. */
export type Tuning = Partial<typeof TUNE>;

export function createSimulation(
  seed: Array<{ id: string; x: number; y: number; r?: number; pinned?: boolean }>,
  edges: Array<{ from: string; to: string }>,
  tuning?: Tuning,
): Simulation {
  // Mutated in place by setTuning and read fresh on every tick, so a slider
  // dragged mid-run lands on the next frame rather than the next remount.
  const tune = { ...TUNE, ...tuning };
  const nodes: SimNode[] = seed.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    vx: 0,
    vy: 0,
    r: n.r ?? 8,
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
          // d3-force's law: w = k/d², applied along the raw delta, so the
          // force itself falls off as 1/d. Multiplying by the *unit* vector
          // instead (as this did) makes it fall off as 1/d², which is strong
          // enough to stop two marks touching and far too weak to open a graph
          // out — hence the clump.
          const w = k / d2;
          a.vx -= dx * w;
          a.vy -= dy * w;
          b.vx += dx * w;
          b.vy += dy * w;
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

    // Framing, then integration.
    //
    // Two different jobs, and the old code did both with one spring toward the
    // centre — which is why the map collapsed. A per-node pull fights
    // repulsion at every distance, so making it strong enough to keep an
    // unlinked page on screen also crushed the linked ones into a knot.
    //
    // Split: recentring TRANSLATES the whole system so its middle sits in the
    // middle, which frames the map without compressing it at all. The spring
    // that remains is a tenth of what it was, and its only job is to stop two
    // unconnected clusters from drifting to opposite corners.
    let mx = 0;
    let my = 0;
    for (const p of nodes) {
      mx += p.x;
      my += p.y;
    }
    mx = cx - mx / n;
    my = cy - my / n;

    const c = tune.centre * alpha;
    for (const p of nodes) {
      if (p.pinned) {
        p.vx = 0;
        p.vy = 0;
        continue;
      }
      p.x += mx;
      p.y += my;
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

    // Collision, resolved on positions rather than velocity so it cannot be
    // outvoted by the springs and cannot ring. Repulsion alone never settled
    // this: it is a smooth field, so two marks reach an equilibrium wherever
    // the spring pulling them together balances it — which was on top of each
    // other. Two pages are two things and must read as two.
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        const want = a.r + b.r + tune.collide;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= want) continue;
        if (d < 0.01) {
          // Exactly coincident: separate along a fixed axis per pair, never
          // Math.random, so two runs of the same graph still agree.
          dx = (i % 2 ? 1 : -1) * 0.7;
          dy = (j % 2 ? 1 : -1) * 0.7;
          d = Math.hypot(dx, dy);
        }
        const push = (want - d) / d / 2;
        const ox = dx * push;
        const oy = dy * push;
        if (!a.pinned) {
          a.x -= ox;
          a.y -= oy;
        }
        if (!b.pinned) {
          b.x += ox;
          b.y += oy;
        }
      }
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
    setTuning(next: Tuning) {
      Object.assign(tune, next);
    },
  };
}
