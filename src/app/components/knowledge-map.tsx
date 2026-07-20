"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { branchLayout, CANVAS, degreeOf, egoLayout } from "@/lib/graph-layout";
import { createSimulation, SIM_NODE_CAP, type Simulation } from "@/lib/graph-force";
import {
  DEFAULT_SETTINGS,
  readSettings,
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

type XY = { x: number; y: number };
type ViewTransform = { k: number; tx: number; ty: number };

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
  // React's generated ids contain punctuation that is not valid in an HTML id,
  // so strip everything but id-safe characters.
  const uid = `map${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // ---- settings -----------------------------------------------------------
  // Initialised to the defaults so the server render and the first client
  // render are identical; the stored values arrive in an effect below.
  const [settings, setSettings] = useState<GraphSettings>(DEFAULT_SETTINGS);
  const [term, setTerm] = useState("");
  const [panelOpen, setPanelOpen] = useState(showFilters);
  const [reducedMotion, setReducedMotion] = useState(false);
  /** Nothing to persist until the reader actually changes something. */
  const dirty = useRef(false);

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
      paint();
      return;
    }

    const seed = view.visible.map((n) => {
      const from = posRef.current.get(n.id) ?? view.seed[n.id];
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

    simRef.current = createSimulation(seed, view.links);
    runLoop();
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [view, animating, centerId, paint, runLoop]);

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
      <GraphSettingsPanel
        settings={settings}
        set={set}
        onReset={resetSettings}
        open={panelOpen}
        onOpenChange={setPanelOpen}
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
        <p className="map-count" aria-live="polite">
          {view.visible.length} {T.node.toLowerCase()} · {view.links.length} liên kết
        </p>
      </div>

      {reducedMotion && <p className="map-notice">{T.graphMotionOff}</p>}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {view.visible.length === 0 ? (
        <p className="muted">{T.graphNoMatch}</p>
      ) : (
        <svg
          ref={attachSvg}
          className="knowledge-map"
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          style={{ maxHeight: `${height}px` }}
          role="group"
          aria-label={T.graph}
          aria-describedby={`${uid}-help`}
          data-dim={lit ? "on" : "off"}
        >
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
                  data-id={n.id}
                  ref={(el) => {
                    if (el) nodeEls.current.set(n.id, el);
                    return () => {
                      nodeEls.current.delete(n.id);
                    };
                  }}
                  className={`g-node v-${n.verification}${n.id === centerId ? " is-focus" : ""}${
                    isPinned ? " is-pinned" : ""
                  }${near ? " is-near" : " is-far"}`}
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
    </div>
  );
}
