"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { branchLayout, CANVAS, degreeOf, egoLayout } from "@/lib/graph-layout";
import { createSimulation, SIM_NODE_CAP, type Simulation } from "@/lib/graph-force";
import {
  DEFAULT_SETTINGS,
  LINK_TYPES,
  readSettings,
  scale,
  writeSettings,
  type GraphSettings,
  type LinkType,
} from "@/lib/graph-settings";
import { T, verificationStateLabel } from "@/lib/vi";
import { GraphSettingsPanel } from "./graph-settings-panel";
import { cardPosition, loadPreview, NodePreviewCard, type NodePreview } from "./node-link";

// Knowledge map — the Graph Explorer surface (screen-inventory.md) and the
// local map on Node Detail, one component. No graph library and no new
// runtime dependency: the physics is our own loop in src/lib/graph-force.ts.
//
// How the two halves fit together:
//
//   1. RENDER (server + first client render) uses the deterministic layout in
//      graph-layout.ts. The server HTML therefore already contains every mark
//      and every edge in a readable arrangement, so there is no blank frame,
//      no hydration jump, and a reader with JS disabled keeps the whole map.
//   2. MOUNT starts the force simulation SEEDED FROM THOSE SAME POSITIONS
//      (never from random), and from then on positions are written straight
//      to the DOM as `transform` attributes from a ref-held array. Per-frame
//      work never touches React state — a settling graph causes zero renders.
//
// Verification is encoded twice — colour AND shape (circle / diamond /
// square), so the map never depends on colour alone.

export type MapNode = {
  id: string;
  title: string;
  branchId: string;
  branchName: string;
  verification: string;
};
export type MapEdge = { from: string; to: string; linkType: string };

const SHAPE_LABEL: Record<string, string> = {
  verified: "hình tròn",
  unverified: "hình thoi",
  no_source: "hình vuông",
};

/** Pointer travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 4;
const ZOOM_LIMIT = { min: 0.35, max: 4 };

/** Label geometry. Pairs with the `.g-label` rule in globals.css, which owns
 *  everything else about a label (font, size, anchor, colour). */
const LABEL_MAX = 26;
const LABEL_CUT = 25;
const LABEL_DY = 16;
/** Rough advance width of one label character at the .g-label size, for framing. */
const LABEL_EM = 5.6;
/**
 * Zoom at or above which every mark shows its title. Chosen against what
 * fit-to-frame actually produces: a handful of pages frames at k≈1.4 and shows
 * every title, while twenty frames at k≈0.9 and steps down to landmarks only,
 * because at that size twenty titles overlap each other into a grey smear.
 * Zooming in brings the rest back.
 */
const LABEL_ZOOM_ALL = 1.2;
/** Below that, only the marks with links left to show — the shape's landmarks. */
const LABEL_ZOOM_HUBS = 0.6;
/** A mark needs this many links to count as a landmark. */
const HUB_DEGREE = 2;

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
const FADE_ALL_RANGE = [LABEL_ZOOM_ALL * 2, 0] as const;
const FADE_HUBS_RANGE = [LABEL_ZOOM_HUBS * 2, 0] as const;
/** Drawn-radius multiplier. Kept inside ±40% so the largest marks still clear
 *  each other under the simulation's fixed collision gap (TUNE.collide = 16). */
const NODE_SCALE_RANGE = [0.6, 1.4] as const;
/** Edge stroke width in canvas units; 1.4 is the shipped hairline. */
const EDGE_WIDTH_RANGE = [0.4, 2.4] as const;
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
const CENTRE_RANGE = [0, 0.007] as const;
/** Pairwise repulsion. Below ~800 the collision pass alone holds marks apart;
 *  above ~6000 the graph presses against the canvas padding and stops opening. */
const REPEL_RANGE = [800, 6000] as const;
/** Spring stiffness. Kept under 1 so a spring can never overshoot its own
 *  rest length and set the map ringing. The odd-looking ends are the widest
 *  pair whose midpoint is EXACTLY 0.42 in floating point — 0.08…0.76 gives
 *  0.42000000000000004, and "the middle is the shipped default" should be
 *  true bit for bit, not to fifteen decimal places. */
const LINK_FORCE_RANGE = [0.06, 0.78] as const;
/** Rest length of an edge, in canvas units, against a 1000×640 canvas. */
const LINK_DISTANCE_RANGE = [44, 220] as const;

type XY = { x: number; y: number };
type ViewTransform = { k: number; tx: number; ty: number };

/**
 * A media query as state. `false` on the server AND on the first client render
 * — the truth arrives one tick later — so hydration can never disagree.
 */
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/** sqrt keeps a hub from swamping the map: 16 links is twice the radius of 4. */
function markRadius(base: number, degree: number): number {
  return base + Math.min(9, Math.sqrt(degree) * 2.2);
}

/**
 * Every mark shares one set of handlers and reads its own id back off the
 * element. Allocating a closure per node per listener made a hover over a
 * 300-mark map rebuild 1500 functions to change one class name.
 */
function nodeId(e: { currentTarget: SVGGElement }): string {
  return e.currentTarget.dataset.id ?? "";
}

export function KnowledgeMap({
  nodes,
  edges,
  centerId,
}: {
  nodes: MapNode[];
  edges: MapEdge[];
  /** this page sits at the centre, is pinned there, and is drawn larger */
  centerId?: string;
}) {
  const router = useRouter();
  // React's generated ids contain punctuation that is not valid in an HTML id,
  // so strip everything but id-safe characters.
  const uid = `map${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // ---- settings -----------------------------------------------------------
  // Initialised to the defaults so the server render and the first client
  // render are identical; the stored values arrive in an effect below.
  const [settings, setSettings] = useState<GraphSettings>(DEFAULT_SETTINGS);
  const [term, setTerm] = useState("");
  // Closed by default everywhere: open, the panel pushed the map it controls
  // ~350px down the page, which is the wrong thing to show first.
  const [panelOpen, setPanelOpen] = useState(false);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  /** A mouse-and-keyboard help paragraph is noise to someone holding a phone. */
  const coarsePointer = useMedia("(pointer: coarse)");
  /** Nothing to persist until the reader actually changes something. */
  const dirty = useRef(false);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  // Persisting from inside a `setSettings` updater would be a side effect in a
  // function React is allowed to call twice (and does, under StrictMode).
  useEffect(() => {
    if (dirty.current) writeSettings(settings);
  }, [settings]);

  const set = useCallback(
    <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => {
      dirty.current = true;
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const resetSettings = useCallback(() => {
    dirty.current = true;
    setSettings(DEFAULT_SETTINGS);
    setTerm("");
  }, []);

  // ---- preview card -------------------------------------------------------
  const cardId = `${uid}-card`;
  const [peek, setPeek] = useState<{ id: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);
  /** The node whose neighbourhood is lit up. Hover or keyboard focus sets it. */
  const [active, setActive] = useState<string | null>(null);
  /** Bumped per request, so a slow card for A cannot land on top of B's. */
  const peekToken = useRef(0);

  const onPeek = useCallback((id: string, target: Element) => {
    const token = ++peekToken.current;
    setActive(id);
    setPeek({ id, ...cardPosition(target) });
    setPreview(null);
    void loadPreview(id).then((p) => {
      if (peekToken.current === token) setPreview(p);
    });
  }, []);
  const onLeave = useCallback(() => {
    peekToken.current++;
    setActive(null);
    setPeek(null);
  }, []);

  // ---- which nodes and edges are on screen --------------------------------
  const branchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of nodes) seen.set(n.branchId, n.branchName);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [nodes]);

  const view = useMemo(() => {
    const q = term.trim().toLowerCase();
    // The centre of a local map is the thing the map is about: no filter may
    // remove it. Orphans stay visible — a page with no links is information.
    const visible = nodes.filter(
      (n) =>
        n.id === centerId ||
        ((!settings.branchId || n.branchId === settings.branchId) &&
          (!q || n.title.toLowerCase().includes(q))),
    );
    const ids = new Set(visible.map((n) => n.id));
    const links = edges.filter(
      (e) => ids.has(e.from) && ids.has(e.to) && settings.linkTypes[e.linkType as LinkType] !== false,
    );

    const degree = degreeOf(links);
    const seed = centerId ? egoLayout(visible, centerId) : branchLayout(visible, degree);
    return { visible, links, seed, degree };
  }, [nodes, edges, centerId, term, settings.branchId, settings.linkTypes]);

  // Past this size the loop costs more than it explains: keep the
  // deterministic layout, silently.
  const animating = !reducedMotion && view.visible.length <= SIM_NODE_CAP;

  const radii = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of view.visible) {
      map.set(n.id, markRadius(n.id === centerId ? 12 : 8, view.degree[n.id] ?? 0));
    }
    return map;
  }, [view, centerId]);

  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of view.links) {
      if (!map.has(e.from)) map.set(e.from, new Set());
      if (!map.has(e.to)) map.set(e.to, new Set());
      map.get(e.from)!.add(e.to);
      map.get(e.to)!.add(e.from);
    }
    return map;
  }, [view.links]);

  const lit = useMemo(() => {
    if (!active) return null;
    return new Set<string>([active, ...(neighbours.get(active) ?? [])]);
  }, [active, neighbours]);

  // ---- refs the animation writes through ----------------------------------
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const edgeEls = useRef(new Map<string, { el: SVGLineElement; from: string; to: string }>());
  const posRef = useRef(new Map<string, XY>());
  const simRef = useRef<Simulation | null>(null);
  const rafRef = useRef(0);
  const viewT = useRef<ViewTransform>({ k: 1, tx: 0, ty: 0 });
  // The two zoom thresholds the labels step at, held in a ref rather than read
  // from `settings` inside `paint`. `paint` is a dependency of the effect that
  // builds the simulation, so letting it change identity on every drag of the
  // fade slider would tear down and rebuild the physics sixty times a second.
  const labelZoom = useRef({ all: LABEL_ZOOM_ALL, hubs: LABEL_ZOOM_HUBS });
  // ponytail: rather than detect "the simulation has settled", the view refits
  // every tick until the reader zooms or pans. Fewer lines, and the map is
  // framed at every instant instead of only at the end.
  const autoFit = useRef(true);

  const [pinned, setPinned] = useState<Set<string>>(() => new Set());
  // The rebuild effect deliberately does not list `pinned` as a dependency
  // (pinning is applied to the live simulation instead of rebuilding it), so
  // it reads it through a ref to avoid acting on a stale closure.
  const pinnedRef = useRef(pinned);
  const [announce, setAnnounce] = useState("");

  /** Write the current positions and view transform straight to the DOM. */
  const paint = useCallback(() => {
    const vt = viewT.current;
    viewportRef.current?.setAttribute(
      "transform",
      `translate(${vt.tx.toFixed(2)} ${vt.ty.toFixed(2)}) scale(${vt.k.toFixed(4)})`,
    );
    // Titles are drawn at a fixed size, so zooming out packs them until they
    // overlap each other and the marks. Past the point where they stop being
    // readable they are noise, and the shape of the graph is the thing worth
    // looking at — so they step down: every title, then hubs only, then none.
    // A hovered or focused mark keeps its title at any zoom (see .g-label).
    // The two thresholds come from the reader's "ngưỡng hiện tên" slider.
    const lz = labelZoom.current;
    svgRef.current?.setAttribute(
      "data-labels",
      vt.k >= lz.all ? "all" : vt.k >= lz.hubs ? "hubs" : "none",
    );
    for (const [id, el] of nodeEls.current) {
      const p = posRef.current.get(id);
      if (!p) continue;
      el.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    }
    for (const { el, from, to } of edgeEls.current.values()) {
      const a = posRef.current.get(from);
      const b = posRef.current.get(to);
      if (!a || !b) continue;
      el.setAttribute("x1", a.x.toFixed(2));
      el.setAttribute("y1", a.y.toFixed(2));
      el.setAttribute("x2", b.x.toFixed(2));
      el.setAttribute("y2", b.y.toFixed(2));
    }
  }, []);

  /** Frame every mark. `speak` is off for the automatic fit — a live region
   *  must not talk to itself, and per-frame React state is banned here. */
  const fitToView = useCallback(
    (speak = true) => {
      const points = [...posRef.current.values()];
      if (points.length === 0) {
        viewT.current = { k: 1, tx: 0, ty: 0 };
        paint();
        return;
      }
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      // A mark is not a point: its title hangs below it and runs wider than it
      // in both directions, so a square margin frames the dots and clips the
      // words. These are the label's own dimensions, not a guess.
      const padX = (LABEL_MAX * LABEL_EM) / 2 + 12;
      const padTop = 30;
      const padBottom = LABEL_DY + 18;
      const minX = Math.min(...xs) - padX;
      const maxX = Math.max(...xs) + padX;
      const minY = Math.min(...ys) - padTop;
      const maxY = Math.max(...ys) + padBottom;
      const k = Math.max(
        ZOOM_LIMIT.min,
        Math.min(
          ZOOM_LIMIT.max,
          Math.min(CANVAS.width / (maxX - minX), CANVAS.height / (maxY - minY)),
        ),
      );
      viewT.current = {
        k,
        tx: CANVAS.width / 2 - ((minX + maxX) / 2) * k,
        ty: CANVAS.height / 2 - ((minY + maxY) / 2) * k,
      };
      paint();
      if (speak) setAnnounce(`${T.graphZoomReset} · ${Math.round(k * 100)}%`);
    },
    [paint],
  );

  /** Paint, but keep the view framed while the reader has not moved it. */
  const settle = useCallback(() => {
    if (autoFit.current) fitToView(false);
    else paint();
  }, [fitToView, paint]);

  const runLoop = useCallback(() => {
    if (rafRef.current) return;
    const step = () => {
      rafRef.current = 0;
      const sim = simRef.current;
      if (!sim) return;
      const alive = sim.tick();
      for (const n of sim.nodes) posRef.current.set(n.id, { x: n.x, y: n.y });
      settle();
      // Stopping at the alpha floor is what keeps an idle tab at 0% CPU.
      if (alive) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [settle]);

  // ---- the display sliders ------------------------------------------------
  // Labels: a ref write, then one repaint. No React work per frame, and no
  // rebuild of anything — moving this slider only changes one attribute.
  useEffect(() => {
    labelZoom.current = {
      all: scale(settings.textFade, ...FADE_ALL_RANGE),
      hubs: scale(settings.textFade, ...FADE_HUBS_RANGE),
    };
    paint();
  }, [settings.textFade, paint]);

  /** Drawn size of a mark and of an edge. Both are pure render: they never
   *  reach the physics, so moving them cannot disturb a settled layout. */
  const nodeScale = scale(settings.nodeSize, ...NODE_SCALE_RANGE);
  const edgeWidth = scale(settings.linkThickness, ...EDGE_WIDTH_RANGE);

  // ---- the four force sliders ---------------------------------------------
  const tuning = useMemo(
    () => ({
      centre: scale(settings.centreForce, ...CENTRE_RANGE),
      repel: scale(settings.repelForce, ...REPEL_RANGE),
      link: scale(settings.linkForce, ...LINK_FORCE_RANGE),
      distance: scale(settings.linkDistance, ...LINK_DISTANCE_RANGE),
    }),
    [settings.centreForce, settings.repelForce, settings.linkForce, settings.linkDistance],
  );
  // Read by the build effect below, which must NOT list the tuning as a
  // dependency: a rebuild on every pixel of slider travel would throw away the
  // simulation the reader is watching. Assigning during render is safe here
  // because the value is derived from props/state and the write is idempotent.
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;

  // A force moved while the loop runs lands on the next frame, not the next
  // remount — and the map is reheated, because a settled graph would otherwise
  // absorb the new force silently and show nothing.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.setTuning(tuning);
    sim.reheat(0.5);
    runLoop();
  }, [tuning, runLoop]);

  /** Obsidian's "Animate": run the layout again from where it stands. The
   *  frame is handed back to the auto-fit so the replay stays in view. */
  const replay = useCallback(() => {
    autoFit.current = true;
    simRef.current?.reheat(1);
    runLoop();
  }, [runLoop]);

  // Build (or rebuild) the simulation whenever the drawn set of nodes/edges
  // changes. Surviving nodes keep the position they already had, so changing a
  // filter nudges the map instead of reshuffling it.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (!animating) {
      // Reduced motion, or too large to simulate: keep the deterministic
      // layout the server already painted, exactly as rendered.
      simRef.current = null;
      const still = new Map<string, XY>();
      for (const n of view.visible) {
        const p = view.seed[n.id];
        if (p) still.set(n.id, { x: p.x, y: p.y });
      }
      posRef.current = still;
      settle();
      return;
    }

    const seed = view.visible.map((n) => {
      const from = posRef.current.get(n.id) ?? view.seed[n.id];
      return {
        id: n.id,
        x: from?.x ?? CANVAS.width / 2,
        y: from?.y ?? CANVAS.height / 2,
        // the drawn size, so collision keeps a hub's own clearance
        r: radii.get(n.id) ?? 8,
        pinned: pinnedRef.current.has(n.id) || n.id === centerId,
      };
    });
    const next = new Map<string, XY>();
    for (const s of seed) next.set(s.id, { x: s.x, y: s.y });
    posRef.current = next;

    simRef.current = createSimulation(seed, view.links, tuningRef.current);
    runLoop();
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [view, animating, centerId, radii, settle, runLoop]);

  // After a re-render that rebuilt the marks, put the DOM back on the
  // simulated positions — the JSX carries the deterministic seed transform,
  // which would otherwise visibly snap the map back. Gated on what `paint`
  // actually reads, so a hover does not trigger a full attribute sweep.
  useLayoutEffect(() => {
    pinnedRef.current = pinned;
    paint();
  }, [view, pinned, paint]);

  // ---- coordinate helpers -------------------------------------------------
  /** Client point → the coordinate space of `el` (svg viewBox, or the pan group). */
  const toLocal = useCallback((el: SVGGraphicsElement | null, clientX: number, clientY: number): XY => {
    const ctm = el?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomAround = useCallback(
    (factor: number, anchor?: XY) => {
      autoFit.current = false; // the reader owns the view from here on
      const vt = viewT.current;
      const k = Math.max(ZOOM_LIMIT.min, Math.min(ZOOM_LIMIT.max, vt.k * factor));
      const a = anchor ?? { x: CANVAS.width / 2, y: CANVAS.height / 2 };
      // Keep the graph point under `a` exactly where it is.
      const gx = (a.x - vt.tx) / vt.k;
      const gy = (a.y - vt.ty) / vt.k;
      viewT.current = { k, tx: a.x - gx * k, ty: a.y - gy * k };
      paint();
    },
    [paint],
  );

  // ---- wheel: never trap the page scroll ----------------------------------
  // Plain wheel is left entirely alone, so the page scrolls exactly as it does
  // everywhere else. Ctrl/⌘ + wheel zooms, which is the modifier browsers and
  // canvas tools already use for zoom, and the help text below says so.
  //
  // The listener is attached by the ref callback rather than by an effect: the
  // <svg> is conditionally rendered, and an effect with stable deps would
  // never re-run to re-attach it after a filter emptied the map.
  const attachSvg = useCallback(
    (el: SVGSVGElement | null) => {
      svgRef.current = el;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        zoomAround(Math.exp(-e.deltaY * 0.0022), toLocal(el, e.clientX, e.clientY));
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => {
        el.removeEventListener("wheel", onWheel);
        svgRef.current = null;
      };
    },
    [zoomAround, toLocal],
  );

  // ---- dragging a node, panning the background ----------------------------
  const drag = useRef<{ id: string; pointerId: number; sx: number; sy: number; moved: boolean } | null>(
    null,
  );
  const pan = useRef<{ pointerId: number; sx: number; sy: number; tx: number; ty: number } | null>(
    null,
  );

  const pinNode = useCallback(
    (id: string, on: boolean) => {
      // The centre of a local map is pinned by definition — it is the thing
      // the map is about, and letting it drift would make the view meaningless.
      if (!on && id === centerId) return;
      const n = simRef.current?.nodes.find((x) => x.id === id);
      if (n) n.pinned = on;
      setPinned((current) => {
        const next = new Set(current);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
      if (!on && animating) {
        simRef.current?.reheat(0.5);
        runLoop();
      }
    },
    [animating, centerId, runLoop],
  );

  const open = useCallback((id: string) => router.push(`/tree/node/${id}`), [router]);

  const onNodePointerDown = useCallback((e: React.PointerEvent<SVGGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation(); // do not also start a background pan
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is an optimisation, not a requirement — carry on without it.
    }
    drag.current = {
      id: nodeId(e),
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
    };
  }, []);

  const onNodePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
      d.moved = true;
      const p = toLocal(viewportRef.current, e.clientX, e.clientY);
      const sim = simRef.current;
      const n = sim?.nodes.find((x) => x.id === d.id);
      if (n) {
        n.x = p.x;
        n.y = p.y;
        n.vx = 0;
        n.vy = 0;
        n.pinned = true; // a dragged node stays where it is dropped
      }
      posRef.current.set(d.id, p);
      paint();
      if (animating) {
        sim?.reheat(0.35);
        runLoop();
      }
    },
    [animating, paint, runLoop, toLocal],
  );

  const onNodePointerUp = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* the pointer may already be gone */
      }
      if (!d.moved) {
        open(d.id); // a press that never moved is still a click
        return;
      }
      pinNode(d.id, true);
    },
    [open, pinNode],
  );

  const onNodePointerCancel = useCallback(() => {
    drag.current = null;
  }, []);

  const onNodeEnter = useCallback(
    (e: React.MouseEvent<SVGGElement> | React.FocusEvent<SVGGElement>) => {
      onPeek(nodeId(e), e.currentTarget);
    },
    [onPeek],
  );

  const onBackgroundPointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* see above */
    }
    const vt = viewT.current;
    pan.current = { pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, tx: vt.tx, ty: vt.ty };
  };

  const onBackgroundPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    const p = pan.current;
    if (!p || p.pointerId !== e.pointerId) return;
    const svg = svgRef.current;
    if (!svg) return;
    autoFit.current = false; // the reader owns the view from here on
    // Screen pixels → viewBox units, so the map tracks the pointer exactly.
    const scale = CANVAS.width / (svg.getBoundingClientRect().width || CANVAS.width);
    viewT.current = {
      ...viewT.current,
      tx: p.tx + (e.clientX - p.sx) * scale,
      ty: p.ty + (e.clientY - p.sy) * scale,
    };
    paint();
  };

  const onBackgroundPointerUp = (e: React.PointerEvent<SVGRectElement>) => {
    if (pan.current?.pointerId === e.pointerId) pan.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onMarkKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      const id = nodeId(e);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(id);
        return;
      }
      if (e.key === "Escape") {
        onLeave();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const was = pinnedRef.current.has(id);
        pinNode(id, !was);
        setAnnounce(was ? T.graphUnpinned : T.graphPinnedOne);
      }
    },
    [onLeave, open, pinNode],
  );

  if (nodes.length === 0) return <p className="muted">{T.graphEmpty}</p>;

  return (
    <div className="map-wrap">
      <div className="map-toolbar">
        {/* Glyphs, not sentences: three full-width rows of Vietnamese prose
            above the map cost more room than the map itself gained. The
            wording survives intact as the accessible name and the tooltip. */}
        <div className="map-zoom" role="group" aria-label={T.graphZoomGroup}>
          {(
            [
              ["+", T.graphZoomIn, () => zoomAround(1.25)],
              ["−", T.graphZoomOut, () => zoomAround(0.8)],
              ["⤢", T.graphZoomReset, () => fitToView()],
            ] as const
          ).map(([glyph, label, act]) => (
            <button
              key={label}
              type="button"
              className="secondary"
              aria-label={label}
              title={label}
              onClick={act}
            >
              {glyph}
            </button>
          ))}
        </div>
        <p className="map-count" aria-live="polite">
          {view.visible.length} {T.node.toLowerCase()} · {view.links.length} liên kết
        </p>
      </div>

      {reducedMotion && <p className="map-notice">{T.graphMotionOff}</p>}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* The stage is the panel's positioning context: the panel floats over
          the canvas the way Obsidian's does, so it costs the map no height.
          On a narrow screen the CSS drops it back into normal flow above the
          map — a 16rem card over a 20rem phone screen is not a control panel,
          it is a lid. */}
      <div className="map-stage">
        <GraphSettingsPanel
          settings={settings}
          set={set}
          onReset={resetSettings}
          onReplay={replay}
          open={panelOpen}
          onOpenChange={setPanelOpen}
          branchOptions={branchOptions}
          term={term}
          onTerm={setTerm}
          idPrefix={uid}
        />

        {view.visible.length === 0 ? (
          <p className="muted">{T.graphNoMatch}</p>
        ) : (
          <svg
            ref={attachSvg}
            className="knowledge-map"
            viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
            /* never taller than 1:1 — past that the map is only bigger dots */
            style={{ maxHeight: CANVAS.height, "--g-edge-w": edgeWidth } as React.CSSProperties}
            role="group"
            aria-label={T.graph}
            aria-describedby={`${uid}-help`}
            data-dim={lit ? "on" : "off"}
          >
            {/* One arrowhead per link type, so a direction marker keeps the
                colour of the line it ends. `context-stroke` would do this with a
                single marker but is not carried by every engine we support, and
                four <marker> elements is cheaper than a fallback.
                ponytail: refX pushes the head back a fixed 24 units so it lands
                beside the target mark rather than under it. Marks are 8–21 units
                of radius, so a hub with the size slider at maximum can still
                swallow its own arrowheads. Per-edge geometry would fix that and
                would mean computing an offset per edge on every frame — do it
                only if a reader reports it. */}
            <defs>
              {LINK_TYPES.map((t) => (
                <marker
                  key={t}
                  id={`${uid}-arrow-${t}`}
                  className={`g-arrow t-${t}`}
                  viewBox="0 0 10 10"
                  /* 34 viewBox units × (7/10 scale to user units) ≈ 24 canvas
                     units of pull-back from the line's end. */
                  refX="34"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  markerUnits="userSpaceOnUse"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              ))}
            </defs>

            {/* Background: the pan surface. Also the click target that dismisses
                the preview card. */}
            <rect
              className="g-surface"
              x="0"
              y="0"
              width={CANVAS.width}
              height={CANVAS.height}
              onPointerDown={onBackgroundPointerDown}
              onPointerMove={onBackgroundPointerMove}
              onPointerUp={onBackgroundPointerUp}
              onPointerCancel={onBackgroundPointerUp}
            />

            <g ref={viewportRef} className="g-viewport">
              <g className="g-edges">
                {view.links.map((e) => {
                  const key = `${e.from}-${e.to}-${e.linkType}`;
                  const a = view.seed[e.from];
                  const b = view.seed[e.to];
                  if (!a || !b) return null;
                  const near = !lit || (lit.has(e.from) && lit.has(e.to));
                  return (
                    <line
                      key={key}
                      ref={(el) => {
                        if (el) edgeEls.current.set(key, { el, from: e.from, to: e.to });
                        return () => {
                          edgeEls.current.delete(key);
                        };
                      }}
                      className={`g-edge t-${e.linkType}${near ? " is-near" : " is-far"}`}
                      markerEnd={settings.arrows ? `url(#${uid}-arrow-${e.linkType})` : undefined}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                    />
                  );
                })}
              </g>

              {view.visible.map((n) => {
                const at = view.seed[n.id];
                if (!at) return null;
                // The DRAWN radius. `radii` stays the physical one the collision
                // pass was given, so scaling the marks never moves them.
                const r = (radii.get(n.id) ?? 8) * nodeScale;
                const isPinned = pinned.has(n.id) || n.id === centerId;
                const near = !lit || lit.has(n.id);
                const label = `${n.title} — ${verificationStateLabel(n.verification)} (${
                  SHAPE_LABEL[n.verification] ?? ""
                })${isPinned ? `, ${T.graphPinnedOne}` : ""}`;
                return (
                  <g
                    key={n.id}
                    data-id={n.id}
                    ref={(el) => {
                      if (el) nodeEls.current.set(n.id, el);
                      return () => {
                        nodeEls.current.delete(n.id);
                      };
                    }}
                    className={`g-node v-${n.verification}${n.id === centerId ? " is-focus" : ""}${
                      near ? " is-near" : " is-far"
                    }${
                      (view.degree[n.id] ?? 0) >= HUB_DEGREE || n.id === centerId ? " is-hub" : ""
                    }`}
                    role="link"
                    tabIndex={0}
                    aria-label={label}
                    aria-describedby={peek?.id === n.id ? cardId : undefined}
                    transform={`translate(${at.x}, ${at.y})`}
                    onPointerDown={onNodePointerDown}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                    onPointerCancel={onNodePointerCancel}
                    onKeyDown={onMarkKeyDown}
                    onMouseEnter={onNodeEnter}
                    onMouseLeave={onLeave}
                    onFocus={onNodeEnter}
                    onBlur={onLeave}
                  >
                    {/* The seal ring: a pinned mark is stamped in place. */}
                    {isPinned && <circle className="g-seal" r={r + 6} />}
                    {n.verification === "verified" ? (
                      <circle className="g-mark" r={r} />
                    ) : n.verification === "unverified" ? (
                      <rect
                        className="g-mark"
                        x={-r}
                        y={-r}
                        width={r * 2}
                        height={r * 2}
                        transform="rotate(45)"
                      />
                    ) : (
                      <rect className="g-mark" x={-r} y={-r} width={r * 2} height={r * 2} rx="2" />
                    )}
                    <text className="g-label" y={r + LABEL_DY}>
                      {n.title.length > LABEL_MAX ? `${n.title.slice(0, LABEL_CUT)}…` : n.title}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {peek && (
        <NodePreviewCard preview={preview} id={cardId} style={{ top: peek.top, left: peek.left }} />
      )}

      {/* Help for the input device actually in the reader's hand. A phone was
          being told to hold Ctrl and use the scroll wheel. */}
      <p className="map-help" id={`${uid}-help`}>
        {coarsePointer ? T.graphTouchHelp : `${T.graphHelp} ${T.graphKeyboardHelp}`}
      </p>

      <ul className="map-legend" aria-label={T.legend}>
        {["verified", "unverified", "no_source"].map((v) => (
          <li key={v}>
            <svg className="legend-mark" viewBox="-12 -12 24 24" aria-hidden="true">
              <g className={`g-node v-${v}`}>
                {v === "verified" ? (
                  <circle className="g-mark" r="7" />
                ) : v === "unverified" ? (
                  <rect className="g-mark" x="-7" y="-7" width="14" height="14" transform="rotate(45)" />
                ) : (
                  <rect className="g-mark" x="-7" y="-7" width="14" height="14" rx="2" />
                )}
              </g>
            </svg>
            {verificationStateLabel(v)} · {SHAPE_LABEL[v]}
          </li>
        ))}
      </ul>
    </div>
  );
}
