"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { branchLayout, CANVAS, degreeOf, egoLayout } from "@/lib/graph-layout";
import { createSimulation, SIM_NODE_CAP, type Simulation } from "@/lib/graph-force";
import {
  LINK_TYPES,
  reachable,
  readSettings,
  defaultSettings,
  writeSettings,
  type GraphSettings,
  type LinkType,
} from "@/lib/graph-settings";
import { T, verificationStateLabel } from "@/lib/vi";
import { GraphSettingsPanel } from "./graph-settings-panel";
import { cardPosition, loadPreview, NodePreviewCard, type NodePreview } from "./node-link";

// Knowledge map — the Graph Explorer surface (screen-inventory.md) and the
// local map on Node Detail, one component. Still no graph library and no new
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
// square). Colouring by branch swaps only the colour axis; the shape keeps
// carrying verification, so the map never depends on colour alone.

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
  archived: "hình vuông",
};

/** How many colours the branch palette cycles through (see --graph-branch-N). */
const BRANCH_COLOURS = 6;
/** Pointer travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 4;
/** Keyboard nudge step, in canvas units. */
const NUDGE = 10;
const ZOOM_LIMIT = { min: 0.35, max: 4 };

type XY = { x: number; y: number };
type ViewTransform = { k: number; tx: number; ty: number };

function markRadius(base: number, degree: number, sizeByLinks: boolean): number {
  if (!sizeByLinks) return base;
  // sqrt keeps a hub from swamping the map: 16 links is twice the radius of 4.
  return base + Math.min(9, Math.sqrt(degree) * 2.2);
}

export function KnowledgeMap({
  nodes,
  edges,
  centerId,
  showFilters = false,
  height = 640,
}: {
  nodes: MapNode[];
  edges: MapEdge[];
  /** local map: this page sits at the centre, is pinned there, and is drawn larger */
  centerId?: string;
  showFilters?: boolean;
  height?: number;
}) {
  const router = useRouter();
  // React's generated ids contain punctuation that is not valid in an HTML id
  // or in a url(#…) reference, so strip everything but id-safe characters.
  const uid = `map${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // ---- settings -----------------------------------------------------------
  // Initialised to the defaults so the server render and the first client
  // render are identical; the stored values arrive in an effect below.
  const [settings, setSettings] = useState<GraphSettings>(defaultSettings);
  const [term, setTerm] = useState("");
  const [panelOpen, setPanelOpen] = useState(showFilters);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const set = useCallback(
    <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => {
      setSettings((current) => {
        const next = { ...current, [key]: value };
        writeSettings(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    const fresh = defaultSettings();
    setSettings(fresh);
    writeSettings(fresh);
    setTerm("");
  }, []);

  // ---- preview card -------------------------------------------------------
  const cardId = `${uid}-card`;
  const [peek, setPeek] = useState<{ id: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);
  /** The node whose neighbourhood is lit up. Hover or keyboard focus sets it. */
  const [active, setActive] = useState<string | null>(null);

  const onPeek = useCallback((id: string, target: Element) => {
    setActive(id);
    setPeek({ id, ...cardPosition(target) });
    setPreview(null);
    void loadPreview(id).then((p) => setPreview((current) => (p?.id === id ? p : current)));
  }, []);
  const onLeave = useCallback(() => {
    setActive(null);
    setPeek(null);
  }, []);

  // ---- which nodes and edges are on screen --------------------------------
  const branchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of nodes) seen.set(n.branchId, n.branchName);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [nodes]);

  /** Stable branch → palette slot, from sorted branch ids so SSR and client agree. */
  const branchSlot = useMemo(() => {
    const ids = [...new Set(nodes.map((n) => n.branchId))].sort();
    return new Map(ids.map((id, i) => [id, (i % BRANCH_COLOURS) + 1]));
  }, [nodes]);

  const view = useMemo(() => {
    const q = term.trim().toLowerCase();
    let visible = nodes.filter(
      (n) =>
        (!settings.branchId || n.branchId === settings.branchId) &&
        (!q || n.title.toLowerCase().includes(q)),
    );

    // Local map: keep only what is reachable from the centre at this depth,
    // following links in the requested direction.
    if (centerId) {
      const keep = reachable(centerId, edges, settings.depth, settings.direction);
      visible = visible.filter((n) => keep.has(n.id) || n.id === centerId);
    }

    let ids = new Set(visible.map((n) => n.id));
    let links = edges.filter(
      (e) => ids.has(e.from) && ids.has(e.to) && settings.linkTypes[e.linkType as LinkType] !== false,
    );

    if (!settings.showOrphans) {
      const linked = new Set<string>();
      for (const e of links) {
        linked.add(e.from);
        linked.add(e.to);
      }
      // The centre of a local map is never an orphan to be hidden.
      visible = visible.filter((n) => linked.has(n.id) || n.id === centerId);
      ids = new Set(visible.map((n) => n.id));
      links = links.filter((e) => ids.has(e.from) && ids.has(e.to));
    }

    const degree = degreeOf(links);
    const seed = centerId ? egoLayout(visible, centerId) : branchLayout(visible, degree);
    return { visible, links, seed, degree };
  }, [
    nodes,
    edges,
    centerId,
    term,
    settings.branchId,
    settings.showOrphans,
    settings.linkTypes,
    settings.depth,
    settings.direction,
  ]);

  const overCap = view.visible.length > SIM_NODE_CAP;
  const animating = settings.animate && !reducedMotion && !overCap;

  const radii = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of view.visible) {
      const base = n.id === centerId ? 12 : 8;
      map.set(n.id, markRadius(base, view.degree[n.id] ?? 0, settings.sizeByLinks));
    }
    return map;
  }, [view, centerId, settings.sizeByLinks]);

  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of view.links) {
      (map.get(e.from) ?? map.set(e.from, new Set()).get(e.from)!).add(e.to);
      (map.get(e.to) ?? map.set(e.to, new Set()).get(e.to)!).add(e.from);
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
  const radiiRef = useRef(radii);
  const simRef = useRef<Simulation | null>(null);
  const rafRef = useRef(0);
  const viewT = useRef<ViewTransform>({ k: 1, tx: 0, ty: 0 });
  const arrowsRef = useRef(settings.showArrows);

  const [pinned, setPinned] = useState<Set<string>>(() => new Set());
  // The rebuild effect deliberately does not list `pinned` or `settings` as
  // dependencies (pinning and force changes are applied to the live
  // simulation instead of rebuilding it), so it reads both through refs to
  // avoid acting on a stale closure after a filter change.
  const pinnedRef = useRef(pinned);
  const settingsRef = useRef(settings);
  const [hint, setHint] = useState("");
  const [announce, setAnnounce] = useState("");
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flashHint = useCallback((message: string) => {
    setHint(message);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(""), 3200);
  }, []);
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  /** Write the current positions and view transform straight to the DOM. */
  const paint = useCallback(() => {
    const vt = viewT.current;
    viewportRef.current?.setAttribute(
      "transform",
      `translate(${vt.tx.toFixed(2)} ${vt.ty.toFixed(2)}) scale(${vt.k.toFixed(4)})`,
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
      let { x: bx, y: by } = b;
      if (arrowsRef.current) {
        // Stop the line short of the target mark so the arrowhead is visible.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const back = (radiiRef.current.get(to) ?? 8) + 7;
        bx = b.x - (dx / d) * back;
        by = b.y - (dy / d) * back;
      }
      el.setAttribute("x1", a.x.toFixed(2));
      el.setAttribute("y1", a.y.toFixed(2));
      el.setAttribute("x2", bx.toFixed(2));
      el.setAttribute("y2", by.toFixed(2));
    }
  }, []);

  const runLoop = useCallback(() => {
    if (rafRef.current) return;
    const step = () => {
      rafRef.current = 0;
      const sim = simRef.current;
      if (!sim) return;
      const alive = sim.tick();
      for (const n of sim.nodes) posRef.current.set(n.id, { x: n.x, y: n.y });
      paint();
      // Stopping at the alpha floor is what keeps an idle tab at 0% CPU.
      if (alive) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [paint]);

  // Build (or rebuild) the simulation whenever the drawn set of nodes/edges
  // changes. Surviving nodes keep the position they already had, so changing a
  // filter nudges the map instead of reshuffling it.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    const seed = view.visible.map((n) => {
      const held = posRef.current.get(n.id);
      const from = held ?? view.seed[n.id];
      return {
        id: n.id,
        x: from?.x ?? CANVAS.width / 2,
        y: from?.y ?? CANVAS.height / 2,
        pinned: pinnedRef.current.has(n.id) || n.id === centerId,
      };
    });

    const next = new Map<string, XY>();
    for (const s of seed) next.set(s.id, { x: s.x, y: s.y });
    posRef.current = next;

    if (overCap) {
      // Too big to simulate: keep the deterministic layout exactly as rendered.
      simRef.current = null;
      for (const n of view.visible) {
        const p = view.seed[n.id];
        if (p) posRef.current.set(n.id, { x: p.x, y: p.y });
      }
      paint();
      return;
    }

    const sim = createSimulation(seed, view.links, settingsRef.current);
    simRef.current = sim;

    if (!animating) {
      // Reduced motion, or motion switched off: jump straight to the
      // settled arrangement without painting a single intermediate frame.
      sim.settle();
      for (const n of sim.nodes) posRef.current.set(n.id, { x: n.x, y: n.y });
      paint();
      return;
    }
    runLoop();
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    // `settings` force values are applied by the effect below, not here, so
    // dragging a slider retunes the running simulation instead of rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, animating, overCap, centerId, paint, runLoop]);

  // Live force retuning: dragging a slider retunes the running simulation
  // rather than rebuilding it, so the map visibly relaxes into the new shape.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.setSettings(settingsRef.current);
    if (!animating) {
      // No motion allowed: recompute the settled arrangement in one go.
      sim.reheat(1);
      sim.settle();
      for (const n of sim.nodes) posRef.current.set(n.id, { x: n.x, y: n.y });
      paint();
      return;
    }
    sim.reheat(0.6);
    runLoop();
  }, [
    settings.centreForce,
    settings.repelForce,
    settings.linkForce,
    settings.linkDistance,
    animating,
    paint,
    runLoop,
  ]);

  // After any React re-render, put the DOM back on the simulated positions —
  // JSX carries the deterministic seed transform, which would otherwise
  // visibly snap the map back on every settings change.
  useLayoutEffect(() => {
    radiiRef.current = radii;
    arrowsRef.current = settings.showArrows;
    pinnedRef.current = pinned;
    settingsRef.current = settings;
    paint();
  });

  // ---- coordinate helpers -------------------------------------------------
  const toGraph = useCallback((clientX: number, clientY: number): XY => {
    const g = viewportRef.current;
    const ctm = g?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  /** Client point → the svg's own viewBox space (before the pan/zoom group). */
  const toCanvas = useCallback((clientX: number, clientY: number): XY => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomAround = useCallback(
    (factor: number, anchor?: XY) => {
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

  const fitToView = useCallback(() => {
    const points = [...posRef.current.values()];
    if (points.length === 0) {
      viewT.current = { k: 1, tx: 0, ty: 0 };
      paint();
      return;
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const pad = 70;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    const k = Math.max(
      ZOOM_LIMIT.min,
      Math.min(ZOOM_LIMIT.max, Math.min(CANVAS.width / (maxX - minX), CANVAS.height / (maxY - minY))),
    );
    viewT.current = {
      k,
      tx: CANVAS.width / 2 - ((minX + maxX) / 2) * k,
      ty: CANVAS.height / 2 - ((minY + maxY) / 2) * k,
    };
    paint();
    setAnnounce(`${T.graphZoomReset} · ${Math.round(k * 100)}%`);
  }, [paint]);

  // ---- wheel: never trap the page scroll ----------------------------------
  // Plain wheel is left entirely alone, so the page scrolls exactly as it does
  // everywhere else. Ctrl/⌘ + wheel zooms, which is the modifier browsers and
  // canvas tools already use for zoom, and a hint says so the first time
  // somebody scrolls over the map.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        flashHint(T.graphWheelHint);
        return;
      }
      e.preventDefault();
      zoomAround(Math.exp(-e.deltaY * 0.0022), toCanvas(e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAround, toCanvas, flashHint]);

  // ---- dragging a node, panning the background, pinch to zoom -------------
  const drag = useRef<{ id: string; pointerId: number; sx: number; sy: number; moved: boolean } | null>(
    null,
  );
  const pan = useRef<{ pointerId: number; sx: number; sy: number; tx: number; ty: number } | null>(
    null,
  );
  const pinch = useRef(new Map<number, XY>());
  const pinchDist = useRef(0);

  const pinNode = useCallback(
    (id: string, on: boolean) => {
      // The centre of a local map is pinned by definition — it is the thing
      // the map is about, and letting it drift would make the view meaningless.
      if (!on && id === centerId) return;
      const sim = simRef.current;
      const n = sim?.nodes.find((x) => x.id === id);
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

  const unpinAll = useCallback(() => {
    for (const n of simRef.current?.nodes ?? []) {
      if (n.id !== centerId) n.pinned = false;
    }
    setPinned(new Set());
    setAnnounce(T.graphUnpinAll);
    if (animating) {
      simRef.current?.reheat(0.8);
      runLoop();
    }
  }, [animating, centerId, runLoop]);

  const open = useCallback((id: string) => router.push(`/tree/node/${id}`), [router]);

  const onNodePointerDown = (id: string) => (e: React.PointerEvent<SVGGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation(); // do not also start a background pan
    try {
      (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    } catch {
      // Capture is an optimisation, not a requirement — carry on without it.
    }
    drag.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
  };

  const onNodePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
    d.moved = true;
    const p = toGraph(e.clientX, e.clientY);
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
  };

  const onNodePointerUp = (id: string) => (e: React.PointerEvent<SVGGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.pointerId !== e.pointerId) return;
    try {
      (e.currentTarget as SVGGElement).releasePointerCapture(e.pointerId);
    } catch {
      /* the pointer may already be gone */
    }
    if (!d.moved) {
      open(id); // a press that never moved is still a click
      return;
    }
    pinNode(id, true);
  };

  const onBackgroundPointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* see above */
    }
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      pan.current = null;
      return;
    }
    const vt = viewT.current;
    pan.current = { pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, tx: vt.tx, ty: vt.ty };
  };

  const onBackgroundPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two fingers: pinch to zoom about the midpoint — the standard gesture,
    // so it is honoured rather than redefined.
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0 && dist > 0) {
        zoomAround(dist / pinchDist.current, toCanvas((a.x + b.x) / 2, (a.y + b.y) / 2));
      }
      pinchDist.current = dist;
      return;
    }

    const p = pan.current;
    if (!p || p.pointerId !== e.pointerId) return;
    const svg = svgRef.current;
    if (!svg) return;
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
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchDist.current = 0;
    if (pan.current?.pointerId === e.pointerId) pan.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onMarkKeyDown = (id: string) => (e: React.KeyboardEvent<SVGGElement>) => {
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
      pinNode(id, !pinned.has(id));
      setAnnounce(pinned.has(id) ? T.graphUnpinAll : T.graphPinnedOne);
      return;
    }
    // Keyboard alternative to dragging: nudge the mark, which pins it.
    const step = e.shiftKey ? NUDGE * 3 : NUDGE;
    const delta: Record<string, XY> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const p = posRef.current.get(id);
    if (!p) return;
    const next = { x: p.x + d.x, y: p.y + d.y };
    const n = simRef.current?.nodes.find((x) => x.id === id);
    if (n) {
      n.x = next.x;
      n.y = next.y;
      n.vx = 0;
      n.vy = 0;
      n.pinned = true;
    }
    posRef.current.set(id, next);
    if (!pinned.has(id)) pinNode(id, true);
    paint();
  };

  if (nodes.length === 0) return <p className="muted">{T.graphEmpty}</p>;

  const pinnedCount = pinned.size;
  const arrowTypes = LINK_TYPES;

  return (
    <div className="map-wrap">
      <GraphSettingsPanel
        settings={settings}
        set={set}
        onReset={resetSettings}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        isLocal={Boolean(centerId)}
        branchOptions={branchOptions}
        term={term}
        onTerm={setTerm}
        idPrefix={uid}
      />

      <div className="map-toolbar">
        <div className="map-zoom" role="group" aria-label={T.graphZoomReset}>
          <button type="button" className="secondary" onClick={() => zoomAround(1.25)}>
            {T.graphZoomIn}
          </button>
          <button type="button" className="secondary" onClick={() => zoomAround(0.8)}>
            {T.graphZoomOut}
          </button>
          <button type="button" className="secondary" onClick={fitToView}>
            {T.graphZoomReset}
          </button>
        </div>
        <button
          type="button"
          className="secondary"
          disabled={reducedMotion || overCap}
          onClick={() => set("animate", !settings.animate)}
        >
          {settings.animate ? T.graphPause : T.graphResume}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={pinnedCount === 0}
          onClick={unpinAll}
        >
          {T.graphUnpinAll}
        </button>
        <p className="map-count" aria-live="polite">
          {view.visible.length} {T.node.toLowerCase()} · {view.links.length} liên kết
          {pinnedCount > 0 && ` · ${pinnedCount} ${T.graphPinned}`}
        </p>
      </div>

      {reducedMotion && <p className="map-notice">{T.graphMotionOff}</p>}
      {overCap && (
        <p className="map-notice" role="status">
          {T.graphCapNotice} {T.graphCapLimit}: {SIM_NODE_CAP}.
        </p>
      )}
      {hint && (
        <p className="map-notice" role="status">
          {hint}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {view.visible.length === 0 ? (
        <p className="muted">{T.graphNoMatch}</p>
      ) : (
        <svg
          ref={svgRef}
          className="knowledge-map"
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          style={{ maxHeight: `${height}px` }}
          role="group"
          aria-label={T.graph}
          aria-describedby={`${uid}-help`}
          data-colour={settings.colourBy}
          data-labels={settings.labelMode}
          data-dim={lit ? "on" : "off"}
        >
          <defs>
            {arrowTypes.map((t) => (
              <marker
                key={t}
                id={`${uid}-arrow-${t}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path className={`g-arrow t-${t}`} d="M 0 0 L 10 5 L 0 10 z" />
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
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    markerEnd={settings.showArrows ? `url(#${uid}-arrow-${e.linkType})` : undefined}
                  />
                );
              })}
            </g>

            {view.visible.map((n) => {
              const at = view.seed[n.id];
              if (!at) return null;
              const r = radii.get(n.id) ?? 8;
              const isPinned = pinned.has(n.id) || n.id === centerId;
              const near = !lit || lit.has(n.id);
              const label = `${n.title} — ${verificationStateLabel(n.verification)} (${
                SHAPE_LABEL[n.verification] ?? ""
              })${isPinned ? `, ${T.graphPinnedOne}` : ""}`;
              return (
                <g
                  key={n.id}
                  ref={(el) => {
                    if (el) nodeEls.current.set(n.id, el);
                    return () => {
                      nodeEls.current.delete(n.id);
                    };
                  }}
                  className={`g-node v-${n.verification}${n.id === centerId ? " is-focus" : ""}${
                    isPinned ? " is-pinned" : ""
                  }${near ? " is-near" : " is-far"}`}
                  style={{ ["--mark-colour" as string]: `var(--graph-branch-${branchSlot.get(n.branchId) ?? 1})` }}
                  role="link"
                  tabIndex={0}
                  aria-label={label}
                  aria-describedby={peek?.id === n.id ? cardId : undefined}
                  transform={`translate(${at.x}, ${at.y})`}
                  onPointerDown={onNodePointerDown(n.id)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp(n.id)}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onKeyDown={onMarkKeyDown(n.id)}
                  onMouseEnter={(e) => onPeek(n.id, e.currentTarget)}
                  onMouseLeave={onLeave}
                  onFocus={(e) => onPeek(n.id, e.currentTarget)}
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
                  <text className="g-label" y={r + 16}>
                    {n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {peek && (
        <NodePreviewCard preview={preview} id={cardId} style={{ top: peek.top, left: peek.left }} />
      )}

      <p className="map-help" id={`${uid}-help`}>
        {T.graphHelp} {T.graphKeyboardHelp}
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

      {settings.colourBy === "branch" && (
        <ul className="map-legend" aria-label={T.graphColourBranch}>
          {branchOptions.map(([id, name]) => (
            <li key={id}>
              <span
                className="legend-swatch"
                style={{ ["--mark-colour" as string]: `var(--graph-branch-${branchSlot.get(id) ?? 1})` }}
                aria-hidden="true"
              />
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
