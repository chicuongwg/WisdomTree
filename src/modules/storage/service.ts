import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import { signDownload } from "@/lib/sign";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { extractionWorker } from "./extraction";
import { objectStore } from "./object-store";
import {
  curations,
  intakeItems,
  sources,
  sourceVersions,
  spaceMembers,
  spaces,
  textChunks,
} from "./schema";
import { promotions } from "../knowledge/schema";

const MAX_SIZE_BYTES = 104_857_600; // 100 MB, intake-constraints.md
/** Exported so the Library page's pager agrees with the query's LIMIT. */
export const LIBRARY_PAGE_SIZE = 20;
const PAGE_SIZE = LIBRARY_PAGE_SIZE;

// Broad formats are accepted for storage (intake-constraints.md); only
// actively dangerous executables are refused outright with 415.
const FORMAT_DENYLIST = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-sh",
]);

export async function uploadSource(
  actor: Principal,
  input: { spaceId: string; title: string; description?: string; file: File },
) {
  authorize(actor, "storage.upload", { spaceId: input.spaceId, kind: "write" });

  if (input.file.size > MAX_SIZE_BYTES) {
    throw new ApiError(413, "file_too_large", "Tệp vượt quá giới hạn 100 MB. Vui lòng chọn tệp nhỏ hơn.");
  }
  const mimeType = input.file.type || "application/octet-stream";
  if (FORMAT_DENYLIST.has(mimeType)) {
    throw new ApiError(415, "format_not_allowed", "Định dạng tệp này không được chấp nhận.");
  }

  const body = Buffer.from(await input.file.arrayBuffer());
  const sourceId = randomUUID();
  const versionId = randomUUID();
  const objectKey = `${sourceId}/${versionId}`;

  // Bytes land in the object store first; the DB transaction then makes the
  // item `stored` — store-first: it is findable and downloadable immediately,
  // extraction has not run yet (extraction_status stays `pending`).
  await objectStore.put(objectKey, body, mimeType);

  const storedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(sources).values({
      id: sourceId,
      spaceId: input.spaceId,
      title: input.title,
      description: input.description ?? null,
      submittedBy: actor.userId,
    });
    await tx.insert(sourceVersions).values({
      id: versionId,
      sourceId,
      seq: 1,
      originalObjectKey: objectKey,
      originalFilename: input.file.name,
      mimeType,
      sizeBytes: body.byteLength,
      checksumSha256: createHash("sha256").update(body).digest("hex"),
      storageState: "stored",
      uploadedBy: actor.userId,
      storedAt,
    });
    await tx.update(sources).set({ currentVersionId: versionId }).where(eq(sources.id, sourceId));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.upload",
      targetType: "source",
      targetId: sourceId,
      details: { spaceId: input.spaceId, versionId, filename: input.file.name },
    });
    await emitOutbox(tx, "source.uploaded", { sourceId, sourceVersionId: versionId, spaceId: input.spaceId });
    await emitOutbox(tx, "source.stored", { sourceId, sourceVersionId: versionId, spaceId: input.spaceId });
  });

  extractionWorker.enqueue(versionId);
  return getSourceDetail(actor, sourceId);
}

/** Store-first Library list: only storage_state = 'stored' matters; extraction never gates. */
export async function listLibrary(
  actor: Principal,
  opts: { spaceId?: string; q?: string; page?: number },
) {
  const visible = scopedToSpaces(actor);
  if (opts.spaceId) {
    authorize(actor, "storage.library.browse", { spaceId: opts.spaceId, kind: "read" });
  }
  const spaceFilter = opts.spaceId
    ? eq(sources.spaceId, opts.spaceId)
    : visible !== null
      ? visible.length
        ? inArray(sources.spaceId, visible)
        : sql`false`
      : undefined;

  const q = opts.q?.trim();
  const textMatch = q
    ? sql`(${sources.title} ILIKE ${"%" + q + "%"} OR EXISTS (
        SELECT 1 FROM ${textChunks}
        WHERE ${textChunks.sourceVersionId} = ${sourceVersions.id}
          AND tsv @@ plainto_tsquery('simple', immutable_unaccent(${q}))
      ))`
    : undefined;

  const page = Math.max(1, opts.page ?? 1);
  return db
    .select({
      sourceId: sources.id,
      spaceId: sources.spaceId,
      spaceName: spaces.name,
      title: sources.title,
      mimeType: sourceVersions.mimeType,
      storedAt: sourceVersions.storedAt,
      extractionStatus: sourceVersions.extractionStatus,
    })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .innerJoin(spaces, eq(sources.spaceId, spaces.id))
    .where(and(eq(sourceVersions.storageState, "stored"), spaceFilter, textMatch))
    .orderBy(desc(sourceVersions.storedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
}

export async function getSourceDetail(actor: Principal, sourceId: string) {
  const [row] = await db
    .select({ source: sources, version: sourceVersions, spaceName: spaces.name })
    .from(sources)
    .leftJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .innerJoin(spaces, eq(sources.spaceId, spaces.id))
    .where(eq(sources.id, sourceId));
  if (!row) throw notFound();
  // Out-of-scope read → 404, never 403 (authorization-design.md).
  authorize(actor, "storage.library.browse", { spaceId: row.source.spaceId, kind: "read" });

  const [{ chunkCount }] = row.version
    ? await db
        .select({ chunkCount: sql<number>`count(*)::int` })
        .from(textChunks)
        .where(eq(textChunks.sourceVersionId, row.version.id))
    : [{ chunkCount: 0 }];

  return {
    id: row.source.id,
    spaceId: row.source.spaceId,
    spaceName: row.spaceName,
    title: row.source.title,
    description: row.source.description,
    trustStatus: row.source.trustStatus,
    submittedBy: row.source.submittedBy,
    version: row.source.version,
    currentVersion: row.version
      ? {
          id: row.version.id,
          sourceId: row.source.id,
          seq: row.version.seq,
          originalFilename: row.version.originalFilename,
          mimeType: row.version.mimeType,
          sizeBytes: row.version.sizeBytes,
          storageState: row.version.storageState,
          extractionStatus: row.version.extractionStatus,
          storedAt: row.version.storedAt,
          chunkCount,
        }
      : null,
  };
}

/**
 * Authorized download: checks scope, then issues the signed-URL substitute
 * (short-lived token for exactly one object key) the route 302-redirects to.
 * Never a public path (demo-brief.md substitution rule).
 */
export async function getDownloadToken(actor: Principal, sourceId: string) {
  const [row] = await db
    .select({ spaceId: sources.spaceId, version: sourceVersions })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.id, sourceId));
  if (!row || row.version.storageState !== "stored") throw notFound();
  authorize(actor, "storage.download", { spaceId: row.spaceId, kind: "read" });
  return signDownload(row.version.originalObjectKey, row.version.originalFilename);
}

/**
 * Does this id name a source at all? The admin Source Detail screen is
 * type-aware — the same id space holds sources and branch-gap requests — and
 * this is the discriminator it branches on.
 */
export async function sourceExists(sourceId: string): Promise<boolean> {
  const [row] = await db.select({ id: sources.id }).from(sources).where(eq(sources.id, sourceId));
  return Boolean(row);
}

/** Load a source with the ownership facts the manage-scope check needs. */
async function loadOwnedSource(actor: Principal, sourceId: string, kind: "read" | "write") {
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.id, sourceId));
  if (!row) throw notFound();
  authorize(actor, "storage.source.manage", {
    ownerIds: [row.source.submittedBy, row.source.assignedTo],
    kind,
  });
  return row;
}

/**
 * Fix the label on your own upload. The bytes and the version history are
 * untouched — this renames the record, which is the mistake people actually
 * make (wrong title, typo) and the one thing a spreadsheet has always let
 * them fix.
 */
export async function renameSource(
  actor: Principal,
  sourceId: string,
  input: { title?: string; description?: string | null },
) {
  const row = await loadOwnedSource(actor, sourceId, "write");
  const title = input.title?.trim();
  if (input.title !== undefined && !title) {
    throw new ApiError(400, "invalid_title", "Tên tư liệu không được để trống.");
  }

  const updated = await db.transaction(async (tx) => {
    const [next] = await tx
      .update(sources)
      .set({
        ...(title ? { title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedAt: new Date(),
        version: row.source.version + 1,
      })
      .where(eq(sources.id, sourceId))
      .returning();
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.rename",
      targetType: "source",
      targetId: sourceId,
      details: { from: row.source.title, to: next.title },
    });
    return next;
  });
  return updated;
}

/**
 * Withdraw your own upload. `storage_state = 'archived'` is the existing
 * mechanism — listLibrary and getDownloadToken both already require 'stored' —
 * so the item leaves the library and stops being downloadable while the bytes,
 * the versions and the audit trail all survive. Nothing here is a hard delete:
 * a storage-first product that can silently lose the original is not one.
 *
 * Refused once anything is derived from it. At that point it is no longer just
 * your upload: an editor's curation or a published page depends on it, and
 * removing it would strand their provenance.
 */
export async function withdrawSource(actor: Principal, sourceId: string) {
  const row = await loadOwnedSource(actor, sourceId, "write");
  if (row.version.storageState !== "stored") {
    throw new ApiError(409, "not_stored", "Tư liệu này không ở trạng thái có thể thu hồi.");
  }

  const [derived] = await db
    .select({ id: curations.id })
    .from(curations)
    .where(eq(curations.sourceVersionId, row.version.id));
  const [published] = await db
    .select({ id: promotions.id })
    .from(promotions)
    .where(eq(promotions.sourceVersionId, row.version.id));
  if (derived || published) {
    throw new ApiError(
      409,
      "source_in_use",
      "Không thể thu hồi: đã có người biên tập hoặc xuất bản dựa trên tư liệu này. Liên hệ quản trị viên.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(sourceVersions)
      .set({ storageState: "archived" })
      .where(eq(sourceVersions.id, row.version.id));
    await tx
      .update(sources)
      .set({ updatedAt: new Date(), version: row.source.version + 1 })
      .where(eq(sources.id, sourceId));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.withdraw",
      targetType: "source",
      targetId: sourceId,
      details: { spaceId: row.source.spaceId, versionId: row.version.id },
    });
  });
}

export async function mySubmissions(actor: Principal) {
  authorize(actor, "storage.submissions.read", { userId: actor.userId, kind: "read" });
  return db
    .select()
    .from(intakeItems)
    .where(eq(intakeItems.submittedBy, actor.userId))
    .orderBy(desc(intakeItems.lastUpdatedAt));
}

/**
 * Create a team space and put the creator in it. Without this the only spaces
 * that exist are the ones the seed script wrote, so a real team installing the
 * app had nowhere to put anything — the first dead end in the product.
 *
 * ponytail: the creator is the only member at creation. Adding others is a
 * membership screen, which is the next thing to build; until it exists an
 * Admin/Op creates the space and members are added by the same seed/admin path
 * as today.
 */
export async function createSpace(actor: Principal, input: { name?: string }) {
  authorize(actor, "storage.space.manage", { kind: "write" });
  const name = input.name?.trim();
  if (!name) throw new ApiError(400, "invalid_space", "Vui lòng nhập tên kho.");

  return db.transaction(async (tx) => {
    const [space] = await tx
      .insert(spaces)
      .values({ name, type: "team", createdBy: actor.userId })
      .returning({ id: spaces.id, name: spaces.name, type: spaces.type });
    await tx
      .insert(spaceMembers)
      .values({ spaceId: space.id, userId: actor.userId, addedBy: actor.userId });
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "space.create",
      targetType: "space",
      targetId: space.id,
      details: { name: space.name },
    });
    return space;
  });
}

export async function listMemberSpaces(actor: Principal) {
  const visible = scopedToSpaces(actor);
  const rows = await db
    .select({ id: spaces.id, name: spaces.name, type: spaces.type })
    .from(spaces)
    .where(visible !== null ? (visible.length ? inArray(spaces.id, visible) : sql`false`) : undefined)
    .orderBy(spaces.name);
  return rows;
}
