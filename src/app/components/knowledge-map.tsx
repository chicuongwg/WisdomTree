"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { branchLayout, CANVAS, degreeOf, egoLayout, type Placed } from "@/lib/graph-layout";
import { T, verificationStateLabel } from "@/lib/vi";
import { cardPosition, loadPreview, NodePreviewCard, type NodePreview } from "./node-link";

// Knowledge map — the Graph Explorer surface (screen-inventory.md) and the
// local 1-hop map on Node Detail, one component. Plain SVG, no library, no
// physics: positions come from the deterministic layout in
// src/lib/graph-layout.ts, computed during render, so the server HTML already
// contains every mark and edge (no blank frame, no hydration jump).
//
// Verification is encoded twice — colour AND shape (circle / diamond /
// square) — so the map never relies on colour alone, and the legend spells
// both out. A mark is a link: click navigates, hover or keyboard focus opens
// the same preview card used everywhere else.

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

function Mark({
  node,
  at,
  focus,
  onOpen,
  onPeek,
  onLeave,
  describedBy,
}: {
  node: MapNode;
  at: Placed;
  focus: boolean;
  onOpen: (id: string) => void;
  onPeek: (id: string, target: Element) => void;
  onLeave: () => void;
  describedBy?: string;
}) {
  const label = `${node.title} — ${verificationStateLabel(node.verification)} (${SHAPE_LABEL[node.verification] ?? ""})`;
  const r = focus ? 11 : 8;
  return (
    <g
      className={`g-node v-${node.verification}${focus ? " is-focus" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={label}
      aria-describedby={describedBy}
      transform={`translate(${at.x}, ${at.y})`}
      onClick={() => onOpen(node.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(node.id);
        } else if (e.key === "Escape") {
          onLeave();
        }
      }}
      onMouseEnter={(e) => onPeek(node.id, e.currentTarget)}
      onMouseLeave={onLeave}
      onFocus={(e) => onPeek(node.id, e.currentTarget)}
      onBlur={onLeave}
    >
      {node.verification === "verified" ? (
        <circle className="g-mark" r={r} />
      ) : node.verification === "unverified" ? (
        <rect className="g-mark" x={-r} y={-r} width={r * 2} height={r * 2} transform="rotate(45)" />
      ) : (
        <rect className="g-mark" x={-r} y={-r} width={r * 2} height={r * 2} rx="2" />
      )}
      <text className="g-label" y={r + 15}>
        {node.title.length > 26 ? `${node.title.slice(0, 25)}…` : node.title}
      </text>
    </g>
  );
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
  /** local map: this page sits at the centre and is drawn larger */
  centerId?: string;
  showFilters?: boolean;
  height?: number;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState("");
  const [term, setTerm] = useState("");
  // One card for the whole map: SVG cannot host HTML, so the preview lives
  // beside the <svg> and is positioned from the hovered/focused mark's rect.
  const cardId = useId();
  const [peek, setPeek] = useState<{ id: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);
  const onPeek = (id: string, target: Element) => {
    setPeek({ id, ...cardPosition(target) });
    setPreview(null);
    void loadPreview(id).then((p) => setPreview((current) => (p?.id === id ? p : current)));
  };
  const onLeave = () => setPeek(null);

  const branchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of nodes) seen.set(n.branchId, n.branchName);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [nodes]);

  const view = useMemo(() => {
    const q = term.trim().toLowerCase();
    const visible = nodes.filter(
      (n) =>
        (!branchId || n.branchId === branchId) &&
        (!q || n.title.toLowerCase().includes(q)) ,
    );
    const ids = new Set(visible.map((n) => n.id));
    const links = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    const placed = centerId
      ? egoLayout(visible, centerId)
      : branchLayout(visible, degreeOf(links));
    return { visible, links, placed };
  }, [nodes, edges, branchId, term, centerId]);

  const open = (id: string) => router.push(`/tree/node/${id}`);

  if (nodes.length === 0) return <p className="muted">{T.graphEmpty}</p>;

  return (
    <div className="map-wrap">
      {showFilters && (
        <div className="map-controls">
          <div className="field">
            <label htmlFor="map-branch">{T.filterByBranch}</label>
            <select id="map-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{T.allBranches}</option>
              {branchOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="map-term">{T.filterByTitle}</label>
            <input
              id="map-term"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={`${T.node}…`}
            />
          </div>
          <p className="map-count" aria-live="polite">
            {view.visible.length} {T.node.toLowerCase()} · {view.links.length} liên kết
          </p>
        </div>
      )}

      {view.visible.length === 0 ? (
        <p className="muted">{T.graphNoMatch}</p>
      ) : (
        <svg
          className="knowledge-map"
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          style={{ maxHeight: `${height}px` }}
          role="group"
          aria-label={T.graph}
        >
          <g className="g-edges">
            {view.links.map((e) => {
              const a = view.placed[e.from];
              const b = view.placed[e.to];
              if (!a || !b) return null;
              return (
                <line
                  key={`${e.from}-${e.to}-${e.linkType}`}
                  className={`g-edge t-${e.linkType}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              );
            })}
          </g>
          {view.visible.map((n) => (
            <Mark
              key={n.id}
              node={n}
              at={view.placed[n.id]}
              focus={n.id === centerId}
              onOpen={open}
              onPeek={onPeek}
              onLeave={onLeave}
              describedBy={peek?.id === n.id ? cardId : undefined}
            />
          ))}
        </svg>
      )}
      {peek && (
        <NodePreviewCard
          preview={preview}
          id={cardId}
          style={{ top: peek.top, left: peek.left }}
        />
      )}

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
