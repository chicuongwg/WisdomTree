import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emitOutbox } from "../audit/service";
import { vaults } from "../knowledge/schema";
import {
  extractionCandidates,
  sources,
  sourceVersions,
  textChunks,
} from "./schema";
import { objectStore } from "./object-store";

const run = promisify(execFile);
const DELAY_MS = Number(process.env.EXTRACTION_DELAY_MS ?? 0);

export type ExtractionMethod = "auto" | "pandoc" | "ocr";
type StoredMethod = Exclude<ExtractionMethod, "auto"> | "text";

const PANDOC_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/html",
  "application/rtf",
]);

function automaticMethod(mimeType: string): StoredMethod {
  if (mimeType === "text/plain" || mimeType === "text/markdown") return "text";
  if (mimeType === "application/pdf") return "text";
  if (mimeType.startsWith("image/")) return "ocr";
  if (PANDOC_MIME_TYPES.has(mimeType)) return "pandoc";
  throw new Error("định dạng không hỗ trợ trích xuất");
}

async function extractMarkdown(
  body: Buffer,
  filename: string,
  mimeType: string,
  requested: ExtractionMethod,
): Promise<{ content: string; method: StoredMethod; engine: string }> {
  const method = requested === "auto" ? automaticMethod(mimeType) : requested;
  const dir = await mkdtemp(path.join(tmpdir(), "wisdomtree-extract-"));
  const extension = path.extname(filename);
  const input = path.join(dir, `input${extension}`);
  await writeFile(input, body);

  try {
    if (method === "pandoc") {
      if (!PANDOC_MIME_TYPES.has(mimeType)) {
        throw new Error("Pandoc không hỗ trợ định dạng đầu vào này");
      }
      const { stdout } = await run("pandoc", [input, "--to=gfm"], { maxBuffer: 50 * 1024 * 1024 });
      return { content: stdout.trim(), method, engine: "pandoc" };
    }

    if (method === "ocr") {
      if (mimeType === "application/pdf") {
        const prefix = path.join(dir, "page");
        await run("pdftoppm", ["-png", "-r", "200", input, prefix], {
          maxBuffer: 10 * 1024 * 1024,
        });
        const pages = (await readdir(dir))
          .filter((name) => name.startsWith("page-") && name.endsWith(".png"))
          .sort();
        const content: string[] = [];
        for (let index = 0; index < pages.length; index++) {
          const { stdout } = await run(
            "tesseract",
            [path.join(dir, pages[index]), "stdout", "-l", "vie+eng"],
            { maxBuffer: 20 * 1024 * 1024 },
          );
          content.push(`## Trang ${index + 1}\n\n${stdout.trim()}`);
        }
        return { content: content.join("\n\n").trim(), method, engine: "tesseract" };
      }
      if (!mimeType.startsWith("image/")) {
        throw new Error("OCR chỉ nhận PDF hoặc ảnh");
      }
      const { stdout } = await run("tesseract", [input, "stdout", "-l", "vie+eng"], {
        maxBuffer: 50 * 1024 * 1024,
      });
      return { content: stdout.trim(), method, engine: "tesseract" };
    }

    if (mimeType === "application/pdf") {
      const { stdout } = await run("pdftotext", ["-layout", input, "-"], {
        maxBuffer: 50 * 1024 * 1024,
      });
      return { content: stdout.trim(), method, engine: "pdftotext" };
    }
    return { content: body.toString("utf8").trim(), method, engine: "utf8" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

class LocalExtractionWorker {
  enqueue(sourceVersionId: string, method: ExtractionMethod = "auto"): void {
    setTimeout(() => {
      void this.process(sourceVersionId, method).catch((err) =>
        console.error(`[extraction] ${sourceVersionId}:`, err),
      );
    }, DELAY_MS);
  }

  async process(sourceVersionId: string, method: ExtractionMethod = "auto"): Promise<void> {
    const [row] = await db
      .select({ version: sourceVersions, submittedBy: sources.submittedBy })
      .from(sourceVersions)
      .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
      .where(eq(sourceVersions.id, sourceVersionId));
    if (!row || row.version.extractionStatus === "processed") return;

    try {
      const [vault] = await db
        .select({ id: vaults.id })
        .from(vaults)
        .where(eq(vaults.ownerUserId, row.submittedBy));
      if (!vault) throw new Error("không tìm thấy kho cá nhân của người tải lên");

      const { body } = await objectStore.get(row.version.originalObjectKey);
      const extracted = await extractMarkdown(
        body,
        row.version.originalFilename,
        row.version.mimeType,
        method,
      );
      if (!extracted.content) throw new Error("không trích xuất được nội dung");

      const paragraphs = extracted.content
        .split(/\r?\n\s*\r?\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 200);

      await db.transaction(async (tx) => {
        for (let index = 0; index < paragraphs.length; index++) {
          await tx
            .insert(textChunks)
            .values({
              sourceVersionId,
              position: index,
              refType: "paragraph",
              refLabel: `¶ ${index + 1}`,
              content: paragraphs[index],
            })
            .onConflictDoNothing();
        }
        await tx
          .insert(extractionCandidates)
          .values({
            sourceVersionId,
            vaultId: vault.id,
            contentMd: extracted.content,
            contentSha256: createHash("sha256").update(extracted.content).digest("hex"),
            method: extracted.method,
            createdBy: row.submittedBy,
          })
          .onConflictDoNothing();
        await tx
          .update(sourceVersions)
          .set({
            extractionStatus: "processed",
            extractionMeta: { engine: extracted.engine },
            updatedAt: new Date(),
            version: row.version.version + 1,
          })
          .where(eq(sourceVersions.id, sourceVersionId));
        await emitOutbox(tx, "source.processed", {
          sourceId: row.version.sourceId,
          sourceVersionId,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "lỗi trích xuất";
      await db
        .update(sourceVersions)
        .set({
          extractionStatus: "unprocessable",
          extractionMeta: { error: message },
          updatedAt: new Date(),
          version: row.version.version + 1,
        })
        .where(eq(sourceVersions.id, sourceVersionId));
      throw error;
    }
  }
}

export const extractionWorker = new LocalExtractionWorker();
