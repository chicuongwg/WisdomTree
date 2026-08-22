import { extractionStateLabel, T, type BadgeTone } from "./vi";

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
  return { label: T.extractionNoText, tone: "no_source" };
}

// ---------------------------------------------------------------------------
// next_action — the one sentence a member sees about what happens to their
// file next. Derived in TS from facts the services already return.
// ---------------------------------------------------------------------------

export type NextActionKey = "archived" | "reading" | "stored" | "promoted";

export function nextActionFor(input: {
  storageState: string | null | undefined;
  extractionStatus: string | null | undefined;
  hasText?: boolean;
  promoted?: boolean;
}): NextActionKey {
  if (input.storageState === "archived") return "archived";
  if (input.promoted) return "promoted";
  if (input.extractionStatus === "pending") return "reading";
  return "stored";
}

export const nextActionLabel: Record<NextActionKey, string> = {
  archived: T.nextActionArchived,
  reading: T.nextActionReading,
  stored: T.nextActionStored,
  promoted: T.nextActionPromoted,
};
