"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useDeferredValue,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { branchLayout, CANVAS, degreeOf, egoLayout } from "@/lib/graph-layout";
import { createSimulation, SIM_NODE_CAP, type Simulation } from "@/lib/graph-force";
import {
  DEFAULT_SETTINGS,
  LINK_TYPES,
  readSettings,
  scale,
  writeSettings,
  type GraphGroup,
  type GraphSettings,
  type LinkType,
} from "@/lib/graph-settings";
import { T, verificationStateLabel } from "@/lib/vi";
import { useShortcutKey } from "@/lib/platform";
import { GraphSettingsPanel } from "./graph-settings-panel";
import {
  cardPosition,
  loadPreview,
  NodePreviewCard,
  PREVIEW_HOVER_DELAY_MS,
  type NodePreview,
} from "./node-link";

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
  tags: string[];
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
 * A media query, answered correctly on the FIRST client render.
 *
 * The old shape — useState(false) plus an effect that corrected it — meant a
 * reader who asks for reduced motion still got one tick of `false`: the
 * simulation was built, ticked, painted, and then thrown away and re-seeded
 * when the effect ran. That is precisely the jump reduced-motion exists to
 * prevent, delivered by the code meant to honour it. The touch help paragraph
 * and the reduced-motion notice flipped a tick after mount for the same
 * reason, shoving the canvas down.
 *
 * useSyncExternalStore has a server snapshot (false, because the server has no
 * viewport) and a client snapshot read synchronously — so hydration matches the
 * HTML and the very first client render already knows the answer.
 */
function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
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

function groupFor(node: MapNode, groups: GraphGroup[]): GraphGroup | undefined {
  return groups.find((group) => {
    const query = group.query.trim().toLocaleLowerCase("vi");
    if (!query) return false;
    if (query.startsWith("tag:"))
      return node.tags.some((tag) => tag.toLocaleLowerCase("vi") === query.slice(4).trim());
    if (query.startsWith("branch:"))
      return node.branchName.toLocaleLowerCase("vi") === query.slice(7).trim();
    return node.title.toLocaleLowerCase("vi").includes(query);
  });
}

export function KnowledgeMap({
  nodes,
  edges,
  centerId,
  scope = "shared",
  initialDepth,
}: {
  nodes: MapNode[];
  edges: MapEdge[];
  /** this page sits at the centre, is pinned there, and is drawn larger */
  centerId?: string;
  scope?: "shared" | "personal";
  initialDepth?: number;
}) {
  const router = useRouter();
  // React's generated ids contain punctuation that is not valid in an HTML id,
  // so strip everything but id-safe characters.
  const uid = `map${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // ---- settings -----------------------------------------------------------
  // Initialised to the defaults so the server render and the first client
  // render are identical; the stored values arrive in an effect below.
  const [settings, setSettings] = useState<GraphSettings>(() => ({
    ...DEFAULT_SETTINGS,
    localDepth: initialDepth ?? DEFAULT_SETTINGS.localDepth,
  }));
  const [term, setTerm] = useState("");
  /**
   * What the map is actually filtered by. The box keeps `term` so typing stays
   * instant; the map follows one step behind.
   *
   * Every keystroke used to rebuild the whole view — re-run the layout over
   * every node, tear the physics down and construct it again — between the key
   * going down and the letter appearing. On a large map the input stuttered
   * under the hand. useDeferredValue lets React paint the letter first and do
   * the expensive part when it has room, and it interrupts itself if another
   * key arrives meanwhile.
   */
  const appliedTerm = useDeferredValue(term);
  // Closed by default everywhere: open, the panel pushed the map it controls
  // ~350px down the page, which is the wrong thing to show first.
  const [panelOpen, setPanelOpen] = useState(false);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  /** A mouse-and-keyboard help paragraph is noise to someone holding a phone. */
  const coarsePointer = useMedia("(pointer: coarse)");
  const shortcut = useShortcutKey();
  /** Nothing to persist until the reader actually changes something. */
  const dirty = useRef(false);

  // Deliberately still an effect, and deliberately NOT a lazy initializer.
  //
  // The saved settings live in localStorage, which the server cannot read, so
  // seeding state from them would make the first client render disagree with
  // the server HTML — a hydration error, which is a worse fault than the flash
  // it would cure. The flash itself is one frame of the unfiltered map before
  // the reader's saved branch filter applies.
  //
  // ponytail: the honest fix is a filter the server can see — in the URL — so
  // the first HTML is already filtered. Worth doing when someone reports the
  // flash; not worth a navigation on every change of a checkbox before then.
  useEffect(() => {
    const stored = readSettings();
    setSettings({
      ...stored,
      localDepth: initialDepth ?? stored.localDepth,
    });
  }, [initialDepth]);

  // Persisting from inside a `setSettings` updater would be a side effect in a
  // function React is allowed to call twice (and does, under StrictMode).
  useEffect(() => {
    if (dirty.current) writeSettings(settings);
  }, [settings]);
  useEffect(() => {
    if (!centerId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("depth", String(settings.localDepth));
    window.history.replaceState(window.history.state, "", url);
  }, [centerId, settings.localDepth]);

  const set = useCallback(<K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => {
    dirty.current = true;
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

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
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const onPeek = useCallback((id: string, target: Element) => {
    const token = ++peekToken.current;
    setActive(id);
    setPeek({ id, ...cardPosition(target) });
    setPreview(null);
    void loadPreview(id).then((p) => {
      if (peekToken.current === token) setPreview(p);
    });
  }, []);
  const onPeekAt = useCallback((id: string, clientX: number, clientY: number) => {
    const token = ++peekToken.current;
    setActive(id);
    setPeek({
      id,
      left: Math.min(clientX + 12, window.innerWidth - 340),
      top: Math.min(clientY + 12, window.innerHeight - 260),
    });
    setPreview(null);
    void loadPreview(id).then((result) => {
      if (peekToken.current === token) setPreview(result);
    });
  }, []);
  const onLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
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
  const tagOptions = useMemo(
    () => [...new Set(nodes.flatMap((node) => node.tags))].sort((a, b) => a.localeCompare(b, "vi")),
    [nodes],
  );

  const view = useMemo(() => {
    const q = appliedTerm.trim().toLocaleLowerCase("vi");
    const enabledEdges = edges.filter(
      (edge) => settings.linkTypes[edge.linkType as LinkType] !== false,
    );
    // The centre of a local map is the thing the map is about: no filter may
    // remove it.
    let visible = nodes.filter(
      (n) =>
        n.id === centerId ||
        ((!settings.branchId || n.branchId === settings.branchId) &&
          (!settings.tag || n.tags.includes(settings.tag)) &&
          (!q || n.title.toLocaleLowerCase("vi").includes(q))),
    );
    let ids = new Set(visible.map((n) => n.id));
    if (!settings.includeOrphans) {
      const linked = new Set<string>();
      for (const edge of enabledEdges) {
        if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
        linked.add(edge.from);
        linked.add(edge.to);
      }
      visible = visible.filter((node) => node.id === centerId || linked.has(node.id));
      ids = new Set(visible.map((node) => node.id));
    }

    if (centerId && ids.has(centerId)) {
      const adjacency = new Map<string, Set<string>>();
      for (const edge of enabledEdges) {
        if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
        if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
        adjacency.get(edge.from)!.add(edge.to);
        adjacency.get(edge.to)!.add(edge.from);
      }
      const reached = new Set([centerId]);
      let frontier = [centerId];
      for (let depth = 0; depth < settings.localDepth; depth++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const neighbour of adjacency.get(id) ?? []) {
            if (reached.has(neighbour)) continue;
            reached.add(neighbour);
            next.push(neighbour);
          }
        }
        frontier = next;
      }
      visible = visible.filter((node) => reached.has(node.id));
      ids = reached;
    }
    const links = enabledEdges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));

    const degree = degreeOf(links);
    const seed = centerId ? egoLayout(visible, centerId) : branchLayout(visible, degree);
    return { visible, links, seed, degree };
  }, [
    nodes,
    edges,
    centerId,
    appliedTerm,
    settings.branchId,
    settings.tag,
    settings.includeOrphans,
    settings.localDepth,
    settings.linkTypes,
  ]);

  const useCanvas = view.visible.length > SIM_NODE_CAP;
  const animating = !reducedMotion;

  const radii = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of view.visible) {
      map.set(n.id, markRadius(n.id === centerId ? 12 : 8, view.degree[n.id] ?? 0));
    }
    return map;
  }, [view, centerId]);
  const canvasLabelIds = useMemo(
    () =>
      new Set(
        [...view.visible]
          .sort((a, b) => (view.degree[b.id] ?? 0) - (view.degree[a.id] ?? 0))
          .slice(0, 120)
          .map((node) => node.id),
      ),
    [view],
  );

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasPaint = useRef<() => void>(() => undefined);
  const hitGrid = useRef(new Map<string, string[]>());
  const viewportRef = useRef<SVGGElement | null>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const edgeEls = useRef(new Map<string, { el: SVGLineElement; from: string; to: string }>());
  const posRef = useRef(new Map<string, XY>());
  const workerRef = useRef<Worker | null>(null);
  const workerGeneration = useRef(0);
  const workerOrder = useRef<string[]>([]);
  const localSimulation = useRef<Simulation | null>(null);
  const localFrame = useRef(0);
  const viewT = useRef<ViewTransform>({ k: 1, tx: 0, ty: 0 });
  // The two zoom thresholds the labels step at, held in a ref rather than read
  // from `settings` inside `paint`. `paint` is a dependency of the effect that
  // builds the simulation, so letting it change identity on every drag of the
  // fade slider would tear down and rebuild the physics sixty times a second.
  const labelZoom = useRef({ all: LABEL_ZOOM_ALL, hubs: LABEL_ZOOM_HUBS });
  // Fit once on entry. Physics and filters must not take the camera back from
  // the reader while the graph is moving.
  const autoFit = useRef(true);

  const [pinned, setPinned] = useState<Set<string>>(() => new Set());
  // The rebuild effect deliberately does not list `pinned` as a dependency
  // (pinning is applied to the live simulation instead of rebuilding it), so
  // it reads it through a ref to avoid acting on a stale closure.
  const pinnedRef = useRef(pinned);
  const [announce, setAnnounce] = useState("");
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!context) return;
    contextRef.current?.querySelector("button")?.focus();
    const close = (event: PointerEvent) => {
      if (!contextRef.current?.contains(event.target as Node)) setContext(null);
    };
    const closeView = () => setContext(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", closeView, true);
    window.addEventListener("resize", closeView);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", closeView, true);
      window.removeEventListener("resize", closeView);
    };
  }, [context]);

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
    canvasPaint.current();
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

  /** Paint the current frame without changing the reader's camera. */
  const settle = useCallback(() => {
    paint();
  }, [paint]);
  const runLocalSimulation = useCallback(() => {
    if (localFrame.current) return;
    const step = () => {
      localFrame.current = 0;
      const simulation = localSimulation.current;
      if (!simulation) return;
      const alive = simulation.tick();
      for (const node of simulation.nodes) {
        posRef.current.set(node.id, { x: node.x, y: node.y });
      }
      settle();
      if (alive) localFrame.current = requestAnimationFrame(step);
    };
    localFrame.current = requestAnimationFrame(step);
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

  canvasPaint.current = () => {
    const canvas = canvasRef.current;
    if (!canvas || !useCanvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    const css = getComputedStyle(canvas);
    const baseScale = Math.min(rect.width / CANVAS.width, rect.height / CANVAS.height);
    const ox = (rect.width - CANVAS.width * baseScale) / 2;
    const oy = (rect.height - CANVAS.height * baseScale) / 2;
    const vt = viewT.current;
    const cull = view.visible.length > 2000;
    const bounds = {
      x0: -vt.tx / vt.k - 80,
      y0: -vt.ty / vt.k - 80,
      x1: (CANVAS.width - vt.tx) / vt.k + 80,
      y1: (CANVAS.height - vt.ty) / vt.k + 80,
    };
    const inView = (point: XY) =>
      !cull ||
      (point.x >= bounds.x0 &&
        point.x <= bounds.x1 &&
        point.y >= bounds.y0 &&
        point.y <= bounds.y1);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = css.getPropertyValue("--color-surface");
    context.fillRect(0, 0, rect.width, rect.height);
    context.translate(ox, oy);
    context.scale(baseScale, baseScale);
    context.translate(vt.tx, vt.ty);
    context.scale(vt.k, vt.k);

    const visibleIds = new Set(view.visible.map((node) => node.id));
    context.lineWidth = edgeWidth / vt.k;
    for (const edge of view.links) {
      const from = posRef.current.get(edge.from);
      const to = posRef.current.get(edge.to);
      if (!from || !to) continue;
      if (!inView(from) && !inView(to)) continue;
      const near = !lit || (lit.has(edge.from) && lit.has(edge.to));
      context.globalAlpha = near ? 1 : 0.18;
      context.strokeStyle =
        edge.linkType === "supports"
          ? css.getPropertyValue("--color-canopy")
          : edge.linkType === "contrasts"
            ? css.getPropertyValue("--color-seal")
            : edge.linkType === "part_of"
              ? css.getPropertyValue("--color-cham")
              : css.getPropertyValue("--color-line-strong");
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
      if (settings.arrows) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const targetRadius = (radii.get(edge.to) ?? 8) * nodeScale + 5;
        const x = to.x - Math.cos(angle) * targetRadius;
        const y = to.y - Math.sin(angle) * targetRadius;
        context.fillStyle = context.strokeStyle;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(
          x - Math.cos(angle - Math.PI / 6) * 7,
          y - Math.sin(angle - Math.PI / 6) * 7,
        );
        context.lineTo(
          x - Math.cos(angle + Math.PI / 6) * 7,
          y - Math.sin(angle + Math.PI / 6) * 7,
        );
        context.closePath();
        context.fill();
      }
    }

    const grid = new Map<string, string[]>();
    const labelMode =
      vt.k >= labelZoom.current.all ? "all" : vt.k >= labelZoom.current.hubs ? "hubs" : "none";
    context.font = `12px ${css.getPropertyValue("--font-display")}`;
    context.textAlign = "center";
    context.textBaseline = "top";
    for (const node of view.visible) {
      if (!visibleIds.has(node.id)) continue;
      const position = posRef.current.get(node.id);
      if (!position) continue;
      if (!inView(position)) continue;
      const radius = (radii.get(node.id) ?? 8) * nodeScale;
      const group = groupFor(node, settings.groups);
      const near = !lit || lit.has(node.id);
      context.globalAlpha = near ? 1 : 0.18;
      if (group) {
        context.strokeStyle = group.color;
        context.lineWidth = 3 / vt.k;
        context.beginPath();
        context.arc(position.x, position.y, radius + 5, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle =
        node.verification === "verified"
          ? css.getPropertyValue("--color-canopy")
          : node.verification === "unverified"
            ? css.getPropertyValue("--color-amber-wash")
            : css.getPropertyValue("--color-surface-sunken");
      context.strokeStyle =
        node.verification === "verified"
          ? css.getPropertyValue("--color-canopy-deep")
          : node.verification === "unverified"
            ? css.getPropertyValue("--color-amber")
            : css.getPropertyValue("--color-ink-muted");
      context.lineWidth = 2 / vt.k;
      context.beginPath();
      if (node.verification === "verified") {
        context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      } else if (node.verification === "unverified") {
        context.save();
        context.translate(position.x, position.y);
        context.rotate(Math.PI / 4);
        context.rect(-radius, -radius, radius * 2, radius * 2);
        context.fill();
        context.stroke();
        context.restore();
      } else {
        const size = radius * 2;
        context.rect(position.x - radius, position.y - radius, size, size);
      }
      if (node.verification !== "unverified") {
        context.fill();
        context.stroke();
      }
      if (
        node.id === active ||
        ((!cull || canvasLabelIds.has(node.id)) &&
          (labelMode === "all" ||
            (labelMode === "hubs" && (view.degree[node.id] ?? 0) >= HUB_DEGREE)))
      ) {
        context.globalAlpha = near ? 1 : 0.18;
        context.fillStyle = css.getPropertyValue("--color-ink");
        const title =
          node.title.length > LABEL_MAX ? `${node.title.slice(0, LABEL_CUT)}…` : node.title;
        context.fillText(title, position.x, position.y + radius + LABEL_DY);
      }
      const key = `${Math.floor(position.x / 64)}:${Math.floor(position.y / 64)}`;
      grid.set(key, [...(grid.get(key) ?? []), node.id]);
    }
    context.globalAlpha = 1;
    hitGrid.current = grid;
  };
  useEffect(() => {
    paint();
  }, [
    active,
    canvasLabelIds,
    edgeWidth,
    nodeScale,
    paint,
    settings.arrows,
    settings.groups,
    useCanvas,
    view,
  ]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !useCanvas) return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint, useCanvas]);

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
    workerRef.current?.postMessage({ type: "tuning", tuning });
    if (localSimulation.current) {
      localSimulation.current.setTuning(tuning);
      localSimulation.current.reheat(1);
      runLocalSimulation();
    }
  }, [runLocalSimulation, tuning]);

  const [simulationEpoch, setSimulationEpoch] = useState(0);
  /** Start again from the deterministic layout without moving the camera. */
  const replay = useCallback(() => {
    const reset = new Map<string, XY>();
    for (const node of view.visible) {
      const position = view.seed[node.id];
      if (position) reset.set(node.id, { x: position.x, y: position.y });
    }
    posRef.current = reset;
    paint();
    setSimulationEpoch((value) => value + 1);
  }, [paint, view]);

  // Build (or rebuild) the simulation whenever the drawn set of nodes/edges
  // changes. Surviving nodes keep the position they already had, so changing a
  // filter nudges the map instead of reshuffling it.
  useEffect(() => {
    let disposed = false;
    const generation = ++workerGeneration.current;
    workerRef.current?.terminate();
    workerRef.current = null;
    localSimulation.current = null;
    cancelAnimationFrame(localFrame.current);
    localFrame.current = 0;

    if (!animating) {
      // Reduced motion, or too large to simulate: keep the deterministic
      // layout the server already painted, exactly as rendered.
      const still = new Map<string, XY>();
      for (const n of view.visible) {
        const p = view.seed[n.id];
        if (p) still.set(n.id, { x: p.x, y: p.y });
      }
      posRef.current = still;
      if (autoFit.current) {
        autoFit.current = false;
        fitToView(false);
      } else {
        settle();
      }
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
    if (autoFit.current) {
      autoFit.current = false;
      fitToView(false);
    }

    workerOrder.current = seed.map((node) => node.id);
    const startLocal = () => {
      if (disposed || generation !== workerGeneration.current || localSimulation.current) return;
      if (workerRef.current) workerRef.current.onerror = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      localSimulation.current = createSimulation(seed, view.links, tuningRef.current);
      runLocalSimulation();
    };
    try {
      const worker = new Worker(new URL("../../lib/graph-worker.ts", import.meta.url));
      workerRef.current = worker;
      worker.onerror = () => startLocal();
      worker.onmessage = (
        event: MessageEvent<{ type: string; generation: number; positions: ArrayBuffer }>,
      ) => {
        if (event.data.type !== "frame" || event.data.generation !== workerGeneration.current)
          return;
        const positions = new Float32Array(event.data.positions);
        workerOrder.current.forEach((id, index) => {
          posRef.current.set(id, {
            x: positions[index * 2],
            y: positions[index * 2 + 1],
          });
        });
        settle();
      };
      worker.postMessage({
        type: "init",
        generation,
        seed,
        edges: view.links,
        tuning: tuningRef.current,
      });
    } catch {
      startLocal();
    }
    return () => {
      disposed = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      localSimulation.current = null;
      cancelAnimationFrame(localFrame.current);
      localFrame.current = 0;
    };
  }, [view, animating, centerId, radii, fitToView, runLocalSimulation, settle, simulationEpoch]);

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
  const toLocal = useCallback(
    (el: SVGGraphicsElement | null, clientX: number, clientY: number): XY => {
      const ctm = el?.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    },
    [],
  );

  const canvasToGraph = useCallback((clientX: number, clientY: number): XY => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const base = Math.min(rect.width / CANVAS.width, rect.height / CANVAS.height);
    const ox = (rect.width - CANVAS.width * base) / 2;
    const oy = (rect.height - CANVAS.height * base) / 2;
    const vt = viewT.current;
    return {
      x: ((clientX - rect.left - ox) / base - vt.tx) / vt.k,
      y: ((clientY - rect.top - oy) / base - vt.ty) / vt.k,
    };
  }, []);

  const canvasHit = useCallback(
    (clientX: number, clientY: number): string | null => {
      const point = canvasToGraph(clientX, clientY);
      const cx = Math.floor(point.x / 64);
      const cy = Math.floor(point.y / 64);
      let best: { id: string; distance: number } | null = null;
      for (let x = cx - 1; x <= cx + 1; x++) {
        for (let y = cy - 1; y <= cy + 1; y++) {
          for (const id of hitGrid.current.get(`${x}:${y}`) ?? []) {
            const position = posRef.current.get(id);
            if (!position) continue;
            const distance = Math.hypot(position.x - point.x, position.y - point.y);
            const radius = (radii.get(id) ?? 8) * nodeScale + 6 / viewT.current.k;
            if (distance <= radius && (!best || distance < best.distance)) best = { id, distance };
          }
        }
      }
      return best?.id ?? null;
    },
    [canvasToGraph, nodeScale, radii],
  );

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

  // ---- wheel zooms around the point under the cursor ----------------------
  //
  // The listener is attached by the ref callback rather than by an effect, so
  // it follows the element itself rather than a render: whatever React does
  // with the <svg>, the wheel handler goes with it.
  const attachSvg = useCallback(
    (el: SVGSVGElement | null) => {
      svgRef.current = el;
      if (!el) return;
      const onWheel = (e: WheelEvent) => {
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
  const attachCanvas = useCallback(
    (element: HTMLCanvasElement | null) => {
      canvasRef.current = element;
      if (!element) return;
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const point = canvasToGraph(event.clientX, event.clientY);
        const vt = viewT.current;
        zoomAround(Math.exp(-event.deltaY * 0.0022), {
          x: point.x * vt.k + vt.tx,
          y: point.y * vt.k + vt.ty,
        });
      };
      element.addEventListener("wheel", onWheel, { passive: false });
      return () => {
        element.removeEventListener("wheel", onWheel);
        canvasRef.current = null;
      };
    },
    [canvasToGraph, zoomAround],
  );

  // ---- dragging a node, panning the background ----------------------------
  const drag = useRef<{
    id: string;
    pointerId: number;
    sx: number;
    sy: number;
    moved: boolean;
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
    [],
  );
  const pan = useRef<{ pointerId: number; sx: number; sy: number; tx: number; ty: number } | null>(
    null,
  );
  const touchPoints = useRef(new Map<number, XY>());
  const pinch = useRef<{
    distance: number;
    midpoint: XY;
    transform: ViewTransform;
  } | null>(null);

  const pinNode = useCallback(
    (id: string, on: boolean) => {
      // The centre of a local map is pinned by definition — it is the thing
      // the map is about, and letting it drift would make the view meaningless.
      if (!on && id === centerId) return;
      workerRef.current?.postMessage({ type: "pin", id, pinned: on });
      const local = localSimulation.current?.nodes.find((node) => node.id === id);
      if (local) {
        local.pinned = on;
        if (!on) {
          localSimulation.current?.reheat(0.5);
          runLocalSimulation();
        }
      }
      setPinned((current) => {
        const next = new Set(current);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [centerId, runLocalSimulation],
  );

  const open = useCallback((id: string) => router.push(`/tree/node/${id}`), [router]);
  const openLocal = useCallback(
    (id: string) =>
      router.push(
        `/graph?node=${encodeURIComponent(id)}${scope === "personal" ? "&scope=personal" : ""}`,
      ),
    [router, scope],
  );

  const showContext = useCallback((id: string, clientX: number, clientY: number) => {
    setContext({
      id,
      x: Math.min(clientX, window.innerWidth - 220),
      y: Math.min(clientY, window.innerHeight - 170),
    });
  }, []);

  const onNodePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.stopPropagation(); // do not also start a background pan
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Capture is an optimisation, not a requirement — carry on without it.
      }
      const id = nodeId(e);
      drag.current = {
        id,
        pointerId: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
      };
      if (e.pointerType !== "mouse") {
        longPressTimer.current = setTimeout(() => {
          drag.current = null;
          showContext(id, e.clientX, e.clientY);
        }, 500);
      }
    },
    [showContext],
  );

  const onNodePointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      d.moved = true;
      const p = toLocal(viewportRef.current, e.clientX, e.clientY);
      workerRef.current?.postMessage({
        type: "move",
        id: d.id,
        x: p.x,
        y: p.y,
        pinned: true,
      });
      const local = localSimulation.current?.nodes.find((node) => node.id === d.id);
      if (local) {
        local.x = p.x;
        local.y = p.y;
        local.vx = 0;
        local.vy = 0;
        local.pinned = true;
        localSimulation.current?.reheat(0.35);
        runLocalSimulation();
      }
      posRef.current.set(d.id, p);
      paint();
    },
    [paint, runLocalSimulation, toLocal],
  );

  const onNodePointerUp = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const d = drag.current;
      drag.current = null;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
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
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    drag.current = null;
  }, []);

  const onNodeEnter = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      const id = nodeId(e);
      const target = e.currentTarget;
      setActive(id);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => onPeek(id, target), PREVIEW_HOVER_DELAY_MS);
    },
    [onPeek],
  );

  /**
   * Focus does what hover does, and additionally moves the map's single tab
   * stop to the mark that now has it — so leaving the map and coming back
   * returns to where the reader was, not to the first mark in the layout.
   */
  const onNodeFocus = useCallback(
    (e: React.FocusEvent<SVGGElement>) => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
      setActiveId(nodeId(e));
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

  const canvasHoverId = useRef<string | null>(null);
  const onCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.current.size === 2) {
        const [a, b] = [...touchPoints.current.values()];
        pinch.current = {
          distance: Math.hypot(b.x - a.x, b.y - a.y),
          midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          transform: { ...viewT.current },
        };
        drag.current = null;
        pan.current = null;
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is optional */
    }
    if (pinch.current) return;
    const id = canvasHit(event.clientX, event.clientY);
    if (id) {
      drag.current = {
        id,
        pointerId: event.pointerId,
        sx: event.clientX,
        sy: event.clientY,
        moved: false,
      };
      if (event.pointerType !== "mouse") {
        longPressTimer.current = setTimeout(() => {
          drag.current = null;
          showContext(id, event.clientX, event.clientY);
        }, 500);
      }
      return;
    }
    const vt = viewT.current;
    pan.current = {
      pointerId: event.pointerId,
      sx: event.clientX,
      sy: event.clientY,
      tx: vt.tx,
      ty: vt.ty,
    };
  };

  const onCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch" && touchPoints.current.has(event.pointerId)) {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinch.current && touchPoints.current.size >= 2) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const [a, b] = [...touchPoints.current.values()];
      const nowDistance = Math.hypot(b.x - a.x, b.y - a.y);
      const nowMidpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const rect = canvas.getBoundingClientRect();
      const base = Math.min(rect.width / CANVAS.width, rect.height / CANVAS.height);
      const ox = (rect.width - CANVAS.width * base) / 2;
      const oy = (rect.height - CANVAS.height * base) / 2;
      const start = pinch.current;
      const startAnchor = {
        x: (start.midpoint.x - rect.left - ox) / base,
        y: (start.midpoint.y - rect.top - oy) / base,
      };
      const currentAnchor = {
        x: (nowMidpoint.x - rect.left - ox) / base,
        y: (nowMidpoint.y - rect.top - oy) / base,
      };
      const graphPoint = {
        x: (startAnchor.x - start.transform.tx) / start.transform.k,
        y: (startAnchor.y - start.transform.ty) / start.transform.k,
      };
      const k = Math.max(
        ZOOM_LIMIT.min,
        Math.min(ZOOM_LIMIT.max, start.transform.k * (nowDistance / start.distance)),
      );
      viewT.current = {
        k,
        tx: currentAnchor.x - graphPoint.x * k,
        ty: currentAnchor.y - graphPoint.y * k,
      };
      paint();
      return;
    }
    const moving = drag.current;
    if (moving?.pointerId === event.pointerId) {
      if (
        !moving.moved &&
        Math.hypot(event.clientX - moving.sx, event.clientY - moving.sy) < DRAG_THRESHOLD
      )
        return;
      moving.moved = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const point = canvasToGraph(event.clientX, event.clientY);
      posRef.current.set(moving.id, point);
      workerRef.current?.postMessage({
        type: "move",
        id: moving.id,
        x: point.x,
        y: point.y,
        pinned: true,
      });
      const local = localSimulation.current?.nodes.find((node) => node.id === moving.id);
      if (local) {
        local.x = point.x;
        local.y = point.y;
        local.vx = 0;
        local.vy = 0;
        local.pinned = true;
        localSimulation.current?.reheat(0.35);
        runLocalSimulation();
      }
      paint();
      return;
    }
    const panning = pan.current;
    if (panning?.pointerId === event.pointerId) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const base = Math.min(rect.width / CANVAS.width, rect.height / CANVAS.height);
      viewT.current = {
        ...viewT.current,
        tx: panning.tx + (event.clientX - panning.sx) / base,
        ty: panning.ty + (event.clientY - panning.sy) / base,
      };
      paint();
      return;
    }
    const id = canvasHit(event.clientX, event.clientY);
    if (id === canvasHoverId.current) return;
    canvasHoverId.current = id;
    onLeave();
    if (!id) {
      paint();
      return;
    }
    setActive(id);
    hoverTimer.current = setTimeout(
      () => onPeekAt(id, event.clientX, event.clientY),
      PREVIEW_HOVER_DELAY_MS,
    );
  };

  const onCanvasPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    touchPoints.current.delete(event.pointerId);
    if (touchPoints.current.size < 2) pinch.current = null;
    const moving = drag.current;
    drag.current = null;
    pan.current = null;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    if (moving?.pointerId === event.pointerId) {
      if (moving.moved) pinNode(moving.id, true);
      else open(moving.id);
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  /**
   * The map is one tab stop, not one per mark.
   *
   * Every visible mark used to carry tabIndex={0}, so a two-hundred-page map
   * was two hundred presses of Tab between the toolbar above it and the help
   * text below — with no way past except the browser's address bar. That is
   * the shape of a keyboard trap even though nothing technically traps.
   *
   * So: one mark in the tab order, arrows move between marks, Home and End
   * reach the ends. The same pattern a listbox or a toolbar uses, and the
   * reason the arrow keys were free to take it is that the surface pans with
   * the pointer, never with the keyboard.
   */
  const [activeId, setActiveId] = useState<string | null>(null);
  // The remembered mark can be filtered away; fall back to the first visible
  // one so the map never ends up with no tab stop at all.
  const tabStopId = view.visible.some((n) => n.id === activeId)
    ? activeId
    : (view.visible[0]?.id ?? null);

  const focusMark = useCallback((id: string) => {
    setActiveId(id);
    nodeEls.current.get(id)?.focus();
  }, []);

  const onMarkKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      const id = nodeId(e);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(id);
        return;
      }
      if (e.key === "+" || e.key === "=" || e.key === "-") {
        e.preventDefault();
        zoomAround(e.key === "-" ? 0.8 : 1.25);
        return;
      }
      if (e.key === "Escape") {
        onLeave();
        setContext(null);
        return;
      }
      if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        showContext(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
        return;
      }
      const order = view.visible;
      const here = order.findIndex((n) => n.id === id);
      const step =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp"
            ? -1
            : 0;
      if (step !== 0 && here !== -1) {
        e.preventDefault();
        // Wraps, so the last mark leads back to the first rather than into a
        // dead end the reader has to guess their way out of.
        const next = order[(here + step + order.length) % order.length];
        if (next) focusMark(next.id);
        return;
      }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        const edge = e.key === "Home" ? order[0] : order[order.length - 1];
        if (edge) focusMark(edge.id);
        return;
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const was = pinnedRef.current.has(id);
        pinNode(id, !was);
        setAnnounce(was ? T.graphUnpinned : T.graphPinnedOne);
      }
    },
    [focusMark, onLeave, open, pinNode, showContext, view.visible, zoomAround],
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

      {reducedMotion && <p className="notice">{T.graphMotionOff}</p>}
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
          tagOptions={tagOptions}
          local={Boolean(centerId)}
          term={term}
          onTerm={setTerm}
          idPrefix={uid}
        />

        {/* A filter that matches nothing empties the map; it does not remove it.
            The canvas used to be swapped out for a paragraph, so filtering to
            zero results made the map — and every pixel of height it held —
            vanish, and the page collapsed around the words. The svg is
            unconditional now and the message is laid over it (.map-empty), so
            the reader keeps a blank map exactly where the map was, and gets it
            back the moment the term matches something again. */}
        {view.visible.length === 0 && <p className="map-empty">{T.graphNoMatch}</p>}
        <canvas
          ref={attachCanvas}
          className="knowledge-map graph-canvas"
          hidden={!useCanvas}
          tabIndex={useCanvas ? 0 : -1}
          role="application"
          aria-label={
            active
              ? `${nodes.find((node) => node.id === active)?.title ?? T.graph} · ${T.graph}`
              : T.graph
          }
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
          onPointerLeave={() => {
            if (!drag.current && !pan.current) {
              canvasHoverId.current = null;
              onLeave();
              paint();
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            const id = canvasHit(event.clientX, event.clientY);
            if (id) showContext(id, event.clientX, event.clientY);
          }}
          onKeyDown={(event) => {
            if (!view.visible.length) return;
            const current = view.visible.findIndex((node) => node.id === active);
            if (event.key === "Enter" && active) {
              open(active);
              return;
            }
            if (event.key === "+" || event.key === "=" || event.key === "-") {
              event.preventDefault();
              zoomAround(event.key === "-" ? 0.8 : 1.25);
              return;
            }
            if (event.key.startsWith("Arrow")) {
              event.preventDefault();
              const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
              const next =
                view.visible[(current + step + view.visible.length) % view.visible.length];
              if (next) {
                setActive(next.id);
                setAnnounce(next.title);
                paint();
              }
            }
            if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              if (active) showContext(active, rect.left + rect.width / 2, rect.top + 40);
            }
          }}
        />
        <svg
          ref={attachSvg}
          className="knowledge-map"
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          /* the drawn height is the map screen fill in globals.css now */
          style={
            {
              "--g-edge-w": edgeWidth,
              display: useCanvas ? "none" : undefined,
            } as React.CSSProperties
          }
          role="group"
          aria-label={T.graph}
          aria-describedby={`${uid}-help`}
          data-dim={lit ? "on" : "off"}
          aria-hidden={useCanvas || undefined}
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

          <g ref={viewportRef}>
            <g>
              {(useCanvas ? [] : view.links).map((e) => {
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

            {(useCanvas ? [] : view.visible).map((n) => {
              const at = view.seed[n.id];
              if (!at) return null;
              // The DRAWN radius. `radii` stays the physical one the collision
              // pass was given, so scaling the marks never moves them.
              const r = (radii.get(n.id) ?? 8) * nodeScale;
              const isPinned = pinned.has(n.id) || n.id === centerId;
              const group = groupFor(n, settings.groups);
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
                  }${(view.degree[n.id] ?? 0) >= HUB_DEGREE || n.id === centerId ? " is-hub" : ""}`}
                  role="link"
                  tabIndex={n.id === tabStopId ? 0 : -1}
                  aria-label={label}
                  aria-describedby={peek?.id === n.id ? cardId : undefined}
                  style={group ? ({ "--g-group": group.color } as React.CSSProperties) : undefined}
                  transform={`translate(${at.x}, ${at.y})`}
                  onPointerDown={onNodePointerDown}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                  onPointerCancel={onNodePointerCancel}
                  onKeyDown={onMarkKeyDown}
                  onMouseEnter={onNodeEnter}
                  onMouseLeave={onLeave}
                  onFocus={onNodeFocus}
                  onBlur={onLeave}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    showContext(n.id, event.clientX, event.clientY);
                  }}
                >
                  {/* The seal ring: a pinned mark is stamped in place. */}
                  {group && <circle className="g-group-ring" r={r + 5} />}
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
      </div>

      {peek && (
        <NodePreviewCard preview={preview} id={cardId} style={{ top: peek.top, left: peek.left }} />
      )}
      {context && (
        <div
          ref={contextRef}
          className="graph-context-menu"
          role="menu"
          style={{ left: context.x, top: context.y }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setContext(null);
          }}
        >
          <button type="button" role="menuitem" onClick={() => open(context.id)}>
            {T.graphContextOpen}
          </button>
          <button type="button" role="menuitem" onClick={() => openLocal(context.id)}>
            {T.graphContextLocal}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={context.id === centerId}
            onClick={() => {
              const on = !pinnedRef.current.has(context.id);
              pinNode(context.id, on);
              setContext(null);
            }}
          >
            {context.id === centerId
              ? T.graphPinnedOne
              : pinned.has(context.id)
                ? T.graphContextUnpin
                : T.graphContextPin}
          </button>
        </div>
      )}

      {/* Help for the input device actually in the reader's hand. A phone was
          being told to hold Ctrl and use the scroll wheel. */}
      <p className="map-help" id={`${uid}-help`}>
        {coarsePointer ? T.graphTouchHelp : `${T.graphHelp(shortcut)} ${T.graphKeyboardHelp}`}
      </p>

      <ul className="map-legend" aria-label={T.legend}>
        {["verified", "unverified", "no_source"].map((v) => (
          <li key={v}>
            <svg className="legend-mark" viewBox="-12 -12 24 24" aria-hidden="true">
              <g className={`g-node v-${v}`}>
                {v === "verified" ? (
                  <circle className="g-mark" r="7" />
                ) : v === "unverified" ? (
                  <rect
                    className="g-mark"
                    x="-7"
                    y="-7"
                    width="14"
                    height="14"
                    transform="rotate(45)"
                  />
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
