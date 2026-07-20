"use client";

import { LINK_TYPES, type GraphSettings, type LinkType } from "@/lib/graph-settings";
import { nodeLinkTypeLabel, T } from "@/lib/vi";

// The "Tùy chỉnh bản đồ" panel — what the reader may narrow the map down to.
// Three controls: a title search, a branch, and which kinds of link to draw.
// Everything else the map can do is a decision already made for them.
//
// Every control is a real form control (`input`, `select`, `fieldset`,
// `legend`) so the keyboard and screen-reader story is the browser's, not
// something re-implemented with divs.

type Setter = <K extends keyof GraphSettings>(key: K, value: GraphSettings[K]) => void;

export function GraphSettingsPanel({
  settings,
  set,
  onReset,
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

        <div className="graph-panel-foot">
          <button type="button" className="secondary" onClick={onReset}>
            {T.graphResetSettings}
          </button>
        </div>
      </div>
    </details>
  );
}
