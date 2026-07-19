// Dev-mode substitution boundary (docs/roadmap/demo-brief.md): the demo runs
// an in-process stub that flips extraction_status after a delay; V1 swaps in
// the real worker (parser-first, OCR fallback) behind the same interface.
// Store-first guarantee: extraction NEVER gates availability — the item is
// already `stored` and downloadable while this runs (session-summary.md).

export interface ExtractionWorker {
  /** Queue extraction for a stored source version; resolves immediately. */
  enqueue(sourceVersionId: string): void;
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sourceVersions, textChunks } from "./schema";
import { emitOutbox } from "../audit/service";
import { objectStore } from "./object-store";

const DELAY_MS = Number(process.env.EXTRACTION_STUB_DELAY_MS ?? 8000);

// Parser-first formats per docs/requirements/intake-constraints.md; anything
// else is stored but ends `unprocessable` (store-first: the file stays in
// Library either way).
const EXTRACTABLE = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

/**
 * In-process stub: after a delay, flips extraction_status on the version and
 * emits the matching integration-contracts event. Never touches
 * storage_state — extraction must not gate availability.
 */
class StubExtractionWorker implements ExtractionWorker {
  enqueue(sourceVersionId: string): void {
    setTimeout(() => {
      void this.process(sourceVersionId).catch((err) =>
        console.error(`[extraction-stub] ${sourceVersionId}:`, err),
      );
    }, DELAY_MS);
  }

  private async process(sourceVersionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [version] = await tx
        .select()
        .from(sourceVersions)
        .where(eq(sourceVersions.id, sourceVersionId));
      if (!version || version.extractionStatus !== "pending") return;

      const ok = EXTRACTABLE.has(version.mimeType);

      // Plain-text formats really extract in the demo: paragraph chunks feed
      // Library search and the publish excerpt mapping (excerptChunkIds).
      if (ok && (version.mimeType === "text/plain" || version.mimeType === "text/markdown")) {
        const { body } = await objectStore
          .get(version.originalObjectKey)
          .catch(() => ({ body: Buffer.alloc(0) }));
        const paragraphs = body
          .toString("utf8")
          .split(/\r?\n\s*\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .slice(0, 50);
        for (let i = 0; i < paragraphs.length; i++) {
          await tx
            .insert(textChunks)
            .values({
              sourceVersionId,
              position: i,
              refType: "paragraph",
              refLabel: `¶ ${i + 1}`,
              content: paragraphs[i],
            })
            .onConflictDoNothing();
        }
      }

      await tx
        .update(sourceVersions)
        .set({
          extractionStatus: ok ? "processed" : "unprocessable",
          extractionMeta: ok
            ? { engine: "stub", confidence: 1 }
            : { engine: "stub", error: "định dạng không hỗ trợ trích xuất trong bản demo" },
          updatedAt: new Date(),
          version: version.version + 1,
        })
        .where(eq(sourceVersions.id, sourceVersionId));

      await emitOutbox(tx, ok ? "source.processed" : "source.processing_failed", {
        sourceId: version.sourceId,
        sourceVersionId,
      });
    });
    console.log(`[extraction-stub] ${sourceVersionId} done`);
  }
}

export const extractionWorker: ExtractionWorker = new StubExtractionWorker();
