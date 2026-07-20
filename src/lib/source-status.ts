import { extractionStateLabel, type BadgeTone } from "./vi";

// Display-level truth for a stored file. The extraction stub marks PDF/DOCX
// `processed` while writing zero text_chunks, so the status flag alone cannot
// mean "readable" — the chip reads the chunks, not the flag. The DB enum and
// the stub stay untouched; only what the reader is told changes.

export function extractionDisplay(
  status: string,
  hasText: boolean,
  // Accepted so a future rule can special-case a format (say, images) without
  // changing every caller; unused by the current rules.
  _mimeType?: string,
): { label: string; tone: BadgeTone } {
  if (status === "pending") return { label: extractionStateLabel(status), tone: "waiting" };
  if (status === "unprocessable") return { label: extractionStateLabel(status), tone: "attention" };
  if (hasText) return { label: extractionStateLabel(status), tone: "done" };
  // `processed` with no text: the file is stored and fine, but full-text
  // search has not scanned it. Dashed chip — incomplete by shape.
  // TODO(vi): move to src/lib/vi.ts
  return { label: "Chưa đọc được nội dung", tone: "no_source" };
}

// ---------------------------------------------------------------------------
// next_action — the one sentence a member sees about what happens to their
// file next (functional-spec.md:57). Derived in TS from facts the services
// already return; the old intake_items SQL view stays dead.
// ---------------------------------------------------------------------------

export type NextActionKey =
  | "archived"
  | "reading"
  | "stored"
  | "nominated_unassigned"
  | "under_correction"
  | "ready_for_review"
  | "promoted"
  | "rejected";

export function nextActionFor(input: {
  storageState: string | null | undefined;
  extractionStatus: string | null | undefined;
  hasText?: boolean;
  curationState: string | null | undefined;
  /** under_correction splits on whether an editor holds it yet. */
  curationAssigned?: boolean;
  promoted?: boolean;
}): NextActionKey {
  if (input.storageState === "archived") return "archived";
  if (input.promoted || input.curationState === "promoted") return "promoted";
  if (input.curationState === "rejected") return "rejected";
  if (input.curationState === "ready_for_review") return "ready_for_review";
  if (input.curationState === "under_correction") {
    return input.curationAssigned ? "under_correction" : "nominated_unassigned";
  }
  if (input.extractionStatus === "pending") return "reading";
  return "stored";
}

// TODO(vi): move to src/lib/vi.ts once humanities review the copy
export const nextActionLabel: Record<NextActionKey, string> = {
  archived: "Đã thu hồi.",
  reading: "Hệ thống đang đọc nội dung tệp.",
  stored: "Đã lưu — dùng được ngay. Bạn có thể đề cử đưa lên cây tri thức.",
  nominated_unassigned: "Đã đề cử — chờ giao biên tập viên.",
  under_correction: "Đang hiệu đính.",
  ready_for_review: "Chờ duyệt xuất bản.",
  promoted: "Đã xuất bản lên cây tri thức.",
  rejected: "Đề cử không được duyệt — tệp vẫn được lưu.",
};
