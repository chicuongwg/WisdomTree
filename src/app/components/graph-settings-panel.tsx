"use client";

import {
  DEPTH_RANGE,
  LINK_TYPES,
  type ColourBy,
  type Direction,
  type GraphSettings,
  type LabelMode,
  type LinkType,
} from "@/lib/graph-settings";
import { FORCE_RANGE } from "@/lib/graph-force";
import { nodeLinkTypeLabel, T } from "@/lib/vi";

// The "Tùy chỉnh bản đồ" panel — the display settings for the knowledge map.
//
// This is deliberately NOT a translated copy of Obsidian's floating grey
// settings card. It is a folded slip of the same paper as the map, using the
// repo's own panel/field/fieldset language: grouped controls with visible
// labels, every value shown in text beside its slider so nothing is legible
// only as a pixel position.
//
// Every control is a real form control (`input`, `select`, `fieldset`,
// `legend`) so the keyboard and screen-reader story is the browser's, not
// something re-implemented with divs.

type Setter = <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => void;

function Slider({
  id,
  label,
  value,
  range,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div className="graph-slider">
      <label htmlFor={id}>
        {label}
        {/* The number is shown as text: a slider alone leaves the current
            value readable only as a thumb position. */}
        <span className="graph-slider-value">
          {value}
          {suffix}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="graph-check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function GraphSettingsPanel({
  settings,
  set,
  onReset,
  open,
  onOpenChange,
  isLocal,
  branchOptions,
  term,
  onTerm,
  idPrefix,
}: {
  settings: GraphSettings;
  set: Setter;
  onReset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLocal: boolean;
  branchOptions: Array<[string, string]>;
  term: string;
  onTerm: (v: string) => void;
  idPrefix: string;
}) {
  const p = (s: string) => `${idPrefix}-${s}`;

  return (
    // Controlled `open`: React re-applies the `open` attribute on every
    // render, so an uncontrolled <details> would spring back open by itself.
    <details className="graph-panel" open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
      <summary>{T.graphSettings}</summary>
      <div className="graph-panel-body">
        <fieldset className="graph-group">
          <legend>{T.graphGroupFilter}</legend>
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
          <Check
            id={p("orphans")}
            label={T.graphShowOrphans}
            checked={settings.showOrphans}
            onChange={(b) => set("showOrphans", b)}
          />
        </fieldset>

        <fieldset className="graph-group">
          <legend>{T.graphGroupDisplay}</legend>
          <div className="field">
            <label htmlFor={p("colour")}>{T.graphColourBy}</label>
            <select
              id={p("colour")}
              value={settings.colourBy}
              onChange={(e) => set("colourBy", e.target.value as ColourBy)}
            >
              <option value="verification">{T.graphColourVerification}</option>
              <option value="branch">{T.graphColourBranch}</option>
            </select>
            <p className="field-help">{T.graphShapeNote}</p>
          </div>
          <div className="field">
            <label htmlFor={p("labels")}>{T.graphLabels}</label>
            <select
              id={p("labels")}
              value={settings.labelMode}
              onChange={(e) => set("labelMode", e.target.value as LabelMode)}
            >
              <option value="always">{T.graphLabelsAlways}</option>
              <option value="hover">{T.graphLabelsHover}</option>
              <option value="hidden">{T.graphLabelsHidden}</option>
            </select>
          </div>
          <Check
            id={p("size")}
            label={T.graphSizeByLinks}
            checked={settings.sizeByLinks}
            onChange={(b) => set("sizeByLinks", b)}
          />
          <Check
            id={p("arrows")}
            label={T.graphShowArrows}
            checked={settings.showArrows}
            onChange={(b) => set("showArrows", b)}
          />
          <fieldset className="graph-subgroup">
            <legend>{T.graphLinkTypes}</legend>
            {LINK_TYPES.map((t) => (
              <Check
                key={t}
                id={p(`lt-${t}`)}
                label={nodeLinkTypeLabel(t)}
                checked={settings.linkTypes[t]}
                onChange={(b) =>
                  set("linkTypes", { ...settings.linkTypes, [t]: b } as Record<LinkType, boolean>)
                }
              />
            ))}
          </fieldset>
        </fieldset>

        <fieldset className="graph-group">
          <legend>{T.graphGroupForce}</legend>
          <Slider
            id={p("centre")}
            label={T.graphCentreForce}
            value={settings.centreForce}
            range={FORCE_RANGE.centreForce}
            onChange={(n) => set("centreForce", n)}
          />
          <Slider
            id={p("repel")}
            label={T.graphRepelForce}
            value={settings.repelForce}
            range={FORCE_RANGE.repelForce}
            onChange={(n) => set("repelForce", n)}
          />
          <Slider
            id={p("linkf")}
            label={T.graphLinkForce}
            value={settings.linkForce}
            range={FORCE_RANGE.linkForce}
            onChange={(n) => set("linkForce", n)}
          />
          <Slider
            id={p("linkd")}
            label={T.graphLinkDistance}
            value={settings.linkDistance}
            range={FORCE_RANGE.linkDistance}
            onChange={(n) => set("linkDistance", n)}
            suffix=" px"
          />
        </fieldset>

        {isLocal && (
          <fieldset className="graph-group">
            <legend>{T.graphGroupLocal}</legend>
            <Slider
              id={p("depth")}
              label={T.graphDepth}
              value={settings.depth}
              range={{ min: DEPTH_RANGE.min, max: DEPTH_RANGE.max, step: 1 }}
              onChange={(n) => set("depth", n)}
            />
            <div className="field">
              <label htmlFor={p("dir")}>{T.graphDirection}</label>
              <select
                id={p("dir")}
                value={settings.direction}
                onChange={(e) => set("direction", e.target.value as Direction)}
              >
                <option value="both">{T.graphDirectionBoth}</option>
                <option value="outgoing">{T.graphDirectionOutgoing}</option>
                <option value="incoming">{T.graphDirectionIncoming}</option>
              </select>
            </div>
          </fieldset>
        )}

        <div className="graph-panel-foot">
          <button type="button" className="secondary" onClick={onReset}>
            {T.graphResetSettings}
          </button>
        </div>
      </div>
    </details>
  );
}
