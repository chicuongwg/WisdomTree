import { StatusBadge, type StatusTone } from "../primitives/status-badge";

export type SaveState = "unsaved" | "saving" | "saved" | "failed" | "conflict";

const tones: Record<SaveState, StatusTone> = {
  unsaved: "neutral",
  saving: "information",
  saved: "success",
  failed: "danger",
  conflict: "warning",
};

export function SaveStatus({ state, label }: { state: SaveState; label: string }) {
  return (
    <span className="ui-next-save-status" role="status" aria-live="polite" aria-atomic="true">
      <StatusBadge tone={tones[state]}>{label}</StatusBadge>
    </span>
  );
}
