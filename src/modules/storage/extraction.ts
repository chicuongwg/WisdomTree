// Dev-mode substitution boundary (docs/roadmap/demo-brief.md): the demo runs
// an in-process stub that flips extraction_status after a delay; V1 swaps in
// the real worker (parser-first, OCR fallback) behind the same interface.
// Store-first guarantee: extraction NEVER gates availability — the item is
// already `stored` and downloadable while this runs (session-summary.md).

export interface ExtractionWorker {
  /** Queue extraction for a stored source version; resolves immediately. */
  enqueue(sourceVersionId: string): void;
}

// Implementation lands in step 2 (build): StubExtractionWorker with
// EXTRACTION_STUB_DELAY_MS, marking `processed` (or `unprocessable` for a
// designated fixture) and writing extraction_meta + outbox event.
