"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type ForceGraphInstance from "force-graph";
import { forceCollide, forceX, forceY } from "d3-force";
import { T, verificationStateLabel } from "@/lib/vi";
import {
  DEFAULT_SETTINGS,
  readSettings,
  scale,
  writeSettings,
  type GraphSettings,
  type LinkType,
} from "@/lib/graph-settings";
import {
  loadPreview,
  NodePreviewCard,
  PREVIEW_HOVER_DELAY_MS,
  type NodePreview,
} from "../node-link";
import { GraphSettingsPanel } from "../graph-settings-panel";
import { useMedia } from "./use-media";
import { useShortcutKey } from "@/lib/platform";
import {
  degreeOf,
  EDGE_WIDTH_RANGE,
  FADE_ALL_RANGE,
  FADE_HUBS_RANGE,
  groupFor,
  HUB_DEGREE,
  LABEL_CUT,
  LABEL_DY,
  LABEL_MAX,
  LINK_DISTANCE_RANGE,
  LINK_FORCE_RANGE,
  linkProfile,
  markRadius,
  NODE_SCALE_RANGE,
  CENTRE_RANGE,
  REPEL_RANGE,
  SHAPE_LABEL,
  type MapEdge,
  type MapNode,
} from "./model";

// The knowledge map on the open-source `force-graph` engine (canvas 2D,
// d3-force underneath). This component owns the PRODUCT half — filters, the
// settings panel, verification shapes, labels, hover preview, context menu,
// keyboard navigation — and hands rendering, picking, zoom/pan/pinch and the
// physics loop to the library. Client-only: the canvas mounts after
// hydration, behind a skeleton (the SSR SVG of the old hand-rolled engine
// went with that engine).

/** Node object as force-graph mutates it (positions attached in place). */
type SimNode = MapNode & { x?: number; y?: number; fx?: number; fy?: number };
type SimLink = { source: string | SimNode; target: string | SimNode; linkType: string };

const idOf = (end: string | SimNode): string => (typeof end === "string" ? end : end.id);

export type { MapEdge, MapNode } from "./model";

/** CSS token colors, read once per theme so the canvas matches the page. */
type Palette = Record<string, string>;
const TOKENS = [
  "--color-canopy",
  "--color-canopy-deep",
  "--color-amber",
  "--color-amber-wash",
  "--color-surface-sunken",
  "--color-ink",
  "--color-ink-muted",
  "--color-line-strong",
  "--color-seal",
  "--color-cham",
] as const;
function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const palette: Palette = {};
  for (const token of TOKENS) palette[token] = style.getPropertyValue(token).trim();
  return palette;
}

/** #rrggbb → rgba(); non-hex tokens fall back to the original color. */
function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const LINK_COLOR: Record<string, keyof Palette> = {
  related: "--color-line-strong",
  supports: "--color-canopy",
  contrasts: "--color-seal",
  part_of: "--color-cham",
};

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
  const uid = `map${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // ---- settings -----------------------------------------------------------
  const [settings, setSettings] = useState<GraphSettings>(() => ({
    ...DEFAULT_SETTINGS,
    localDepth: initialDepth ?? DEFAULT_SETTINGS.localDepth,
  }));
  const [term, setTerm] = useState("");
  const appliedTerm = useDeferredValue(term);
  const [panelOpen, setPanelOpen] = useState(false);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = useMedia("(pointer: coarse)");
  const shortcut = useShortcutKey();
  const dirty = useRef(false);

  // Stored settings arrive in an effect: localStorage is unreadable during
  // render without breaking hydration.
  useEffect(() => {
    const stored = readSettings();
    setSettings({ ...stored, localDepth: initialDepth ?? stored.localDepth });
  }, [initialDepth]);
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

  // ---- interaction state --------------------------------------------------
  const cardId = `${uid}-card`;
  const [peek, setPeek] = useState<{ id: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);
  /** The node whose neighbourhood is lit up. Hover or keyboard sets it. */
  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active;
  const [pinned, setPinned] = useState<Set<string>>(() => new Set());
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;
  const [context, setContext] = useState<{ id: string; x: number; y: number } | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);
  const [announce, setAnnounce] = useState("");
  const peekToken = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const onLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    peekToken.current++;
    setActive(null);
    setPeek(null);
  }, []);

  const open = useCallback((id: string) => router.push(`/tree/node/${id}`), [router]);
  const openLocal = useCallback(
    (id: string) =>
      router.push(`/graph?node=${id}${scope === "personal" ? "&scope=personal" : ""}`),
    [router, scope],
  );

  const showContext = useCallback((id: string, x: number, y: number) => {
    setContext({
      id,
      x: Math.min(x, window.innerWidth - 220),
      y: Math.min(y, window.innerHeight - 170),
    });
  }, []);
  // Dismiss the menu on outside press, scroll or resize; focus its first item.
  useEffect(() => {
    if (!context) return;
    contextRef.current?.querySelector("button")?.focus();
    const away = (event: PointerEvent) => {
      if (!contextRef.current?.contains(event.target as Node)) setContext(null);
    };
    const close = () => setContext(null);
    window.addEventListener("pointerdown", away);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [context]);

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
    return { visible, links, degree };
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
  const viewRef = useRef(view);
  viewRef.current = view;

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
  const litRef = useRef(lit);
  litRef.current = lit;

  // Derived display values (sliders → real units).
  const display = useMemo(
    () => ({
      labelAll: scale(settings.textFade, ...FADE_ALL_RANGE),
      labelHubs: scale(settings.textFade, ...FADE_HUBS_RANGE),
      nodeScale: scale(settings.nodeSize, ...NODE_SCALE_RANGE),
      edgeWidth: scale(settings.linkThickness, ...EDGE_WIDTH_RANGE),
      arrows: settings.arrows,
      groups: settings.groups,
    }),
    [settings.textFade, settings.nodeSize, settings.linkThickness, settings.arrows, settings.groups],
  );
  const displayRef = useRef(display);
  displayRef.current = display;
  const forces = useMemo(
    () => ({
      centre: scale(settings.centreForce, ...CENTRE_RANGE),
      repel: scale(settings.repelForce, ...REPEL_RANGE),
      link: scale(settings.linkForce, ...LINK_FORCE_RANGE),
      distance: scale(settings.linkDistance, ...LINK_DISTANCE_RANGE),
    }),
    [settings.centreForce, settings.repelForce, settings.linkForce, settings.linkDistance],
  );

  // ---- force-graph instance ----------------------------------------------
  const holderRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphInstance<SimNode, SimLink> | null>(null);
  const paletteRef = useRef<Palette>({});
  const [mounted, setMounted] = useState(false);

  const fitNow = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoomToFit(400, 48);
    setAnnounce(`${T.graphZoomReset} · ${Math.round(graph.zoom() * 100)}%`);
  }, []);

  const pinNode = useCallback((id: string, on: boolean) => {
    const graph = graphRef.current;
    const node = graph?.graphData().nodes.find((n) => n.id === id);
    if (node) {
      if (on) {
        node.fx = node.x;
        node.fy = node.y;
      } else {
        delete node.fx;
        delete node.fy;
      }
    }
    setPinned((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    setAnnounce(on ? T.graphPinnedOne : T.graphUnpinned);
  }, []);

  const replay = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    for (const node of graph.graphData().nodes) {
      if (node.id === centerId) continue;
      delete node.fx;
      delete node.fy;
    }
    setPinned(new Set());
    graph.d3ReheatSimulation();
  }, [centerId]);

  // Mount once: dynamic import keeps the canvas library out of the server
  // bundle entirely.
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      const ForceGraph = (await import("force-graph")).default;
      if (disposed || !holderRef.current) return;
      const holder = holderRef.current;
      paletteRef.current = readPalette(holder);

      const graph = new ForceGraph<SimNode, SimLink>(holder)
        .backgroundColor("rgba(0,0,0,0)")
        .autoPauseRedraw(false)
        .nodeRelSize(1)
        .nodeVal((node) => {
          const r = radiiRef.current.get(node.id) ?? 8;
          return r * displayRef.current.nodeScale;
        })
        .nodeLabel(() => "") // the card + canvas labels replace the tooltip
        .nodeCanvasObject((node, ctx, globalScale) => paintNode(node, ctx, globalScale))
        .nodePointerAreaPaint((node, color, ctx) => {
          const r = (radiiRef.current.get(node.id) ?? 8) * displayRef.current.nodeScale + 4;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
          ctx.fill();
        })
        .linkColor((link) => {
          const palette = paletteRef.current;
          const base = palette[LINK_COLOR[link.linkType] ?? "--color-line-strong"] ?? "#999";
          const litSet = litRef.current;
          if (!litSet) return base;
          const dim = !(litSet.has(idOf(link.source)) && litSet.has(idOf(link.target)));
          return dim ? withAlpha(base, 0.18) : base;
        })
        .linkWidth(() => displayRef.current.edgeWidth)
        .linkDirectionalArrowLength(() => (displayRef.current.arrows ? 5 : 0))
        .linkDirectionalArrowRelPos(1)
        .onNodeHover((node) => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          hoverTimer.current = null;
          if (!node) {
            onLeave();
            return;
          }
          setActive(node.id);
          // The preview card waits the shared hover delay, then anchors to
          // the node's screen position.
          hoverTimer.current = setTimeout(() => {
            const g = graphRef.current;
            if (!g) return;
            const at = g.graph2ScreenCoords(node.x ?? 0, node.y ?? 0);
            const rect = holder.getBoundingClientRect();
            const token = ++peekToken.current;
            setPeek({
              id: node.id,
              left: Math.min(rect.left + at.x + 12, window.innerWidth - 340),
              top: Math.min(rect.top + at.y + 12, window.innerHeight - 260),
            });
            setPreview(null);
            void loadPreview(node.id).then((p) => {
              if (peekToken.current === token) setPreview(p);
            });
          }, PREVIEW_HOVER_DELAY_MS);
        })
        .onNodeClick((node) => open(node.id))
        .onNodeRightClick((node, event) => {
          event.preventDefault();
          showContext(node.id, event.clientX, event.clientY);
        })
        .onNodeDragEnd((node) => {
          // Dragging a node pins it where it was dropped.
          node.fx = node.x;
          node.fy = node.y;
          setPinned((prev) => new Set(prev).add(node.id));
        })
        .onBackgroundClick(() => {
          onLeave();
          setContext(null);
        })
        .cooldownTime(8000);

      // Size to the container, now and on resize.
      const size = () => {
        graph.width(holder.clientWidth);
        graph.height(holder.clientHeight);
      };
      size();
      const observer = new ResizeObserver(size);
      observer.observe(holder);

      // Theme changes re-read the palette (tokens flip with [data-theme]).
      const themeObserver = new MutationObserver(() => {
        paletteRef.current = readPalette(holder);
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      graphRef.current = graph;
      setMounted(true);
      cleanup = () => {
        observer.disconnect();
        themeObserver.disconnect();
        graph._destructor();
        graphRef.current = null;
      };
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
    // (mount-once effect: intentionally empty dependency list)
  }, []);

  // Refs the paint callback reads (kept current without rebuilding the graph).
  const radiiRef = useRef(radii);
  radiiRef.current = radii;

  function paintNode(node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number) {
    const palette = paletteRef.current;
    const d = displayRef.current;
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const r = (radiiRef.current.get(node.id) ?? 8) * d.nodeScale;
    const litSet = litRef.current;
    const dim = litSet ? !litSet.has(node.id) : false;
    const isActive = activeRef.current === node.id;

    ctx.save();
    if (dim) ctx.globalAlpha = 0.18;

    // Group overlay ring (first matching saved group).
    const group = groupFor(node, d.groups);
    if (group) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = group.color;
      ctx.lineWidth = 3 / globalScale;
      ctx.stroke();
    }
    // Pin ring.
    if (pinnedRef.current.has(node.id) || node.id === centerIdRef.current) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, 2 * Math.PI);
      ctx.strokeStyle = palette["--color-ink-muted"];
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }

    // Verification shape: circle / diamond / square.
    const fill =
      node.verification === "verified"
        ? palette["--color-canopy"]
        : node.verification === "unverified"
          ? palette["--color-amber-wash"]
          : palette["--color-surface-sunken"];
    const stroke =
      node.verification === "verified"
        ? palette["--color-canopy-deep"]
        : node.verification === "unverified"
          ? palette["--color-amber"]
          : palette["--color-ink-muted"];
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5 / Math.max(globalScale, 0.001);
    ctx.beginPath();
    if (node.verification === "verified") {
      ctx.arc(x, y, r, 0, 2 * Math.PI);
    } else if (node.verification === "unverified") {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    } else {
      const s = r * 0.9;
      ctx.rect(x - s, y - s, s * 2, s * 2);
    }
    ctx.fill();
    ctx.stroke();

    // Label with LOD: everything above labelAll zoom, landmarks above
    // labelHubs; the hovered/active node always keeps its title.
    const degree = viewRef.current.degree[node.id] ?? 0;
    const showLabel =
      isActive ||
      globalScale >= displayRef.current.labelAll ||
      (globalScale >= displayRef.current.labelHubs && degree >= HUB_DEGREE);
    if (showLabel) {
      const text =
        node.title.length > LABEL_MAX ? `${node.title.slice(0, LABEL_CUT)}…` : node.title;
      ctx.font = `${12 / globalScale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = palette["--color-ink"];
      ctx.fillText(text, x, y + r + LABEL_DY / globalScale / 2);
    }
    ctx.restore();
  }
  const centerIdRef = useRef(centerId);
  centerIdRef.current = centerId;

  // Feed data whenever the filtered view changes. force-graph mutates its
  // input, so hand it clones; carry positions over by id so a filter change
  // does not shuffle the whole map.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !mounted) return;
    const previous = new Map(graph.graphData().nodes.map((n) => [n.id, n]));
    const simNodes: SimNode[] = view.visible.map((n) => {
      const old = previous.get(n.id);
      const base: SimNode = { ...n };
      if (old) {
        base.x = old.x;
        base.y = old.y;
        if (old.fx != null) base.fx = old.fx;
        if (old.fy != null) base.fy = old.fy;
      }
      if (n.id === centerId) {
        base.fx = 0;
        base.fy = 0;
      }
      return base;
    });
    const simLinks: SimLink[] = view.links.map((e) => ({
      source: e.from,
      target: e.to,
      linkType: e.linkType,
    }));
    graph.graphData({ nodes: simNodes, links: simLinks });
    if (reducedMotion) {
      // Settle instantly: no animated drift for readers who asked for none.
      graph.cooldownTicks(0);
      graph.warmupTicks(120);
      graph.d3ReheatSimulation();
    } else {
      graph.cooldownTicks(Infinity);
      graph.warmupTicks(0);
    }
    // Frame the result once the first layout settles.
    const t = setTimeout(fitNow, reducedMotion ? 80 : 600);
    return () => clearTimeout(t);
  }, [view, mounted, centerId, reducedMotion, fitNow]);

  // Physics from the force sliders.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !mounted) return;
    graph.d3Force("charge")?.strength(-forces.repel);
    const link = graph.d3Force("link") as
      | { distance: (fn: (l: SimLink) => number) => void; strength: (fn: (l: SimLink) => number) => void }
      | undefined;
    link?.distance((l: SimLink) => forces.distance * linkProfile(l.linkType).distance);
    link?.strength((l: SimLink) => forces.link * linkProfile(l.linkType).strength);
    graph.d3Force("center", null);
    graph.d3Force("x", forceX(0).strength(forces.centre));
    graph.d3Force("y", forceY(0).strength(forces.centre));
    graph.d3Force(
      "collide",
      forceCollide<SimNode>((n) => (radiiRef.current.get(n.id) ?? 8) * displayRef.current.nodeScale + 4),
    );
    graph.d3ReheatSimulation();
  }, [forces, mounted]);

  const zoomBy = useCallback((factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoom(graph.zoom() * factor, 200);
  }, []);

  // ---- keyboard navigation (container-level, DOM-independent) -------------
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const current = viewRef.current;
      if (!current.visible.length) return;
      const activeId = activeRef.current;
      if (event.key === "Enter" && activeId) {
        open(activeId);
        return;
      }
      if (event.key === "Escape") {
        onLeave();
        setContext(null);
        return;
      }
      if (event.key === "+" || event.key === "=" || event.key === "-") {
        event.preventDefault();
        zoomBy(event.key === "-" ? 0.8 : 1.25);
        return;
      }
      if (event.key === "p" || event.key === "P") {
        if (activeId && activeId !== centerId) {
          event.preventDefault();
          pinNode(activeId, !pinnedRef.current.has(activeId));
        }
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const next =
          event.key === "Home" ? current.visible[0] : current.visible[current.visible.length - 1];
        selectByKeyboard(next);
        return;
      }
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const index = current.visible.findIndex((node) => node.id === activeId);
        const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const next =
          current.visible[(index + step + current.visible.length) % current.visible.length];
        selectByKeyboard(next);
        return;
      }
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        if (activeId) showContext(activeId, rect.left + rect.width / 2, rect.top + 40);
      }
    },
    [open, onLeave, zoomBy, pinNode, showContext, centerId],
  );
  function selectByKeyboard(next: MapNode | undefined) {
    if (!next) return;
    setActive(next.id);
    setAnnounce(next.title);
    const graph = graphRef.current;
    const sim = graph?.graphData().nodes.find((n) => n.id === next.id);
    if (graph && sim) graph.centerAt(sim.x ?? 0, sim.y ?? 0, 250);
  }

  if (nodes.length === 0) return <p className="muted">{T.graphEmpty}</p>;

  const activeTitle = active ? nodes.find((node) => node.id === active)?.title : null;

  return (
    <div className="map-wrap">
      <div className="map-toolbar">
        <div className="map-zoom" role="group" aria-label={T.graphZoomGroup}>
          {(
            [
              ["+", T.graphZoomIn, () => zoomBy(1.25)],
              ["−", T.graphZoomOut, () => zoomBy(0.8)],
              ["⤢", T.graphZoomReset, fitNow],
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

        {view.visible.length === 0 && <p className="map-empty">{T.graphNoMatch}</p>}
        {/* The library renders into this holder; the class carries the sizing
            block AND the e2e contract (exactly one visible .knowledge-map). */}
        <div
          ref={holderRef}
          className="knowledge-map graph-canvas"
          role="application"
          tabIndex={0}
          aria-describedby={`${uid}-help`}
          aria-label={activeTitle ? `${activeTitle} · ${T.graph}` : T.graph}
          onKeyDown={onKeyDown}
        />
        {!mounted && <p className="map-empty">{T.loading}</p>}
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
              pinNode(context.id, !pinnedRef.current.has(context.id));
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

      <p className="map-help" id={`${uid}-help`}>
        {coarsePointer ? T.graphTouchHelp : `${T.graphHelp(shortcut)} ${T.graphKeyboardHelp}`}
      </p>

      <ul className="map-legend" aria-label={T.legend}>
        {(["verified", "unverified", "no_source"] as const).map((v) => (
          <li key={v}>
            <span className={`legend-swatch legend-${v}`} aria-hidden="true" />
            {verificationStateLabel(v)} · {SHAPE_LABEL[v]}
          </li>
        ))}
      </ul>
    </div>
  );
}
