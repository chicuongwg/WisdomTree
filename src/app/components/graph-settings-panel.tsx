"use client";

import { useState } from "react";
import {
  LINK_TYPES,
  type GraphSettings,
  type LinkType,
  type SliderKey,
} from "@/lib/graph-settings";
import { nodeLinkTypeLabel, T } from "@/lib/vi";

// The map's control panel — one floating card at the top right of the canvas,
// modelled on Obsidian's graph controls by owner decision (2026-07-21): a
// header row with a reset and a close, then collapsible sections.
//
// Two departures from Obsidian, both deliberate:
//
//   - There is no "Groups" section. Obsidian's groups colour a subset of the
//     graph by a saved search query. This map already colours by verification
//     state (and by link type on the edges), and it already has a branch
//     filter that does the "show me this part of the tree" job. A second,
//     query-based colouring system would be a whole feature competing with the
//     one that is here, so the branch and link-type filters keep the section
//     Obsidian calls Filters and there is no dead "New group" button.
//   - The panel is a <details>, not a div with a mounted/unmounted body. The
//     controls are therefore in the server HTML even while the panel is shut,
//     which keeps the whole surface readable and findable (Ctrl-F, screen
//     reader) before any JavaScript runs.
//
// Every control is a real form control (`input`, `select`, `fieldset`,
// `legend`) with a real label, so the keyboard and screen-reader story is the
// browser's rather than something re-implemented with divs.

type Setter = <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => void;

/** One label per slider. Typed against SliderKey, so adding a slider to the
 *  settings model fails to compile until it has a Vietnamese name. */
const SLIDER_LABEL: Record<SliderKey, string> = {
  textFade: T.graphTextFade,
  nodeSize: T.graphNodeSize,
  linkThickness: T.graphLinkThickness,
  centreForce: T.graphCentreForce,
  repelForce: T.graphRepelForce,
  linkForce: T.graphLinkForce,
  linkDistance: T.graphLinkDistance,
};

const DISPLAY_SLIDERS = ["textFade", "nodeSize", "linkThickness"] as const;
const FORCE_SLIDERS = ["centreForce", "repelForce", "linkForce", "linkDistance"] as const;

/**
 * A collapsible section. `open` is component state rather than an uncontrolled
 * <details>, because React re-applies the `open` attribute on every render and
 * an uncontrolled one would spring back open by itself — the same trap the
 * panel's own disclosure documents below.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <details className="gp-section" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{title}</summary>
      <div className="gp-section-body">{children}</div>
    </details>
  );
}

export function GraphSettingsPanel({
  settings,
  set,
  onReset,
  onReplay,
  open,
  onOpenChange,
  branchOptions,
  term,
  onTerm,
  idPrefix,
}: {
  settings: GraphSettings;
  set: Setter;
  onReset: () => void;
  /** Replay the layout — Obsidian's "Animate". One call to the simulation. */
  onReplay: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchOptions: Array<[string, string]>;
  term: string;
  onTerm: (v: string) => void;
  idPrefix: string;
}) {
  const p = (s: string) => `${idPrefix}-${s}`;

  const slider = (k: SliderKey) => (
    <div className="gp-slider" key={k}>
      <label htmlFor={p(k)}>{SLIDER_LABEL[k]}</label>
      <input
        id={p(k)}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={settings[k]}
        aria-describedby={k === "textFade" ? p("fade-help") : undefined}
        onChange={(e) => set(k, e.currentTarget.valueAsNumber)}
      />
    </div>
  );

  return (
    // Controlled `open`: React re-applies the `open` attribute on every
    // render, so an uncontrolled <details> would spring back open by itself.
    // Starts closed — see the comment on `panelOpen` in knowledge-map.tsx.
    <details className="graph-panel" open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
      <summary>{T.graphSettings}</summary>
      <div className="graph-panel-body">
        {/* No title here: the <summary> above is already the panel's name, and
            printing it twice put "Tùy chỉnh bản đồ" on two consecutive lines.
            The row is the two glyph buttons alone — Obsidian's pair, restore
            defaults and shut — pushed to the right. Their Vietnamese wording
            lives in the accessible name, which is what a glyph button owes. */}
        <div className="graph-panel-head">
          <button
            type="button"
            className="gp-icon"
            aria-label={T.graphResetSettings}
            title={T.graphResetSettings}
            onClick={onReset}
          >
            ↺
          </button>
          <button
            type="button"
            className="gp-icon"
            aria-label={T.graphClosePanel}
            title={T.graphClosePanel}
            onClick={() => onOpenChange(false)}
          >
            ✕
          </button>
        </div>

        <Section title={T.graphPanelFilters}>
          <div className="field">
            <label htmlFor={p("term")}>{T.filterByTitle}</label>
            <input
              id={p("term")}
              type="search"
              value={term}
              onChange={(e) => onTerm(e.target.value)}
              placeholder={`${T.node}…`}
            />
          </div>
          <div className="field">
            <label htmlFor={p("branch")}>{T.filterByBranch}</label>
            <select
              id={p("branch")}
              value={settings.branchId}
              onChange={(e) => set("branchId", e.target.value)}
            >
              <option value="">{T.allBranches}</option>
              {branchOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="graph-group">
            <legend>{T.graphLinkTypes}</legend>
            {LINK_TYPES.map((t) => (
              <div className="graph-check" key={t}>
                <input
                  id={p(`lt-${t}`)}
                  type="checkbox"
                  checked={settings.linkTypes[t]}
                  onChange={(e) =>
                    set("linkTypes", { ...settings.linkTypes, [t]: e.target.checked } as Record<
                      LinkType,
                      boolean
                    >)
                  }
                />
                <label htmlFor={p(`lt-${t}`)}>{nodeLinkTypeLabel(t)}</label>
              </div>
            ))}
          </fieldset>
        </Section>

        <Section title={T.graphPanelDisplay}>
          <div className="graph-check">
            <input
              id={p("arrows")}
              type="checkbox"
              checked={settings.arrows}
              onChange={(e) => set("arrows", e.target.checked)}
            />
            <label htmlFor={p("arrows")}>{T.graphArrows}</label>
          </div>
          {DISPLAY_SLIDERS.map(slider)}
          <p className="gp-help" id={p("fade-help")}>
            {T.graphTextFadeHelp}
          </p>
          <button type="button" className="secondary gp-wide" onClick={onReplay}>
            {T.graphReplay}
          </button>
        </Section>

        <Section title={T.graphPanelForces}>{FORCE_SLIDERS.map(slider)}</Section>
      </div>
    </details>
  );
}
