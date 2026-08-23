import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import { signDownload } from "@/lib/sign";
import type { Principal } from "../auth/principal";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { extractionWorker, type ExtractionMethod } from "./extraction";
import { putObject } from "./object-store";
import {
  categories,
  folders,
  sources,
  sourcePhysical,
  sourceVersions,
  spaceMembers,
  spaces,
  textChunks,
} from "./schema";
import { promotions } from "../knowledge/schema";
import { users } from "../auth/schema";

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
  input: {
    spaceId: string;
    title: string;
    description?: string;
    file: File;
    extractionMethod?: ExtractionMethod;
  },
) {
  authorize(actor, "storage.upload", { spaceId: input.spaceId, kind: "write" });

  if (input.file.size > MAX_SIZE_BYTES) {
    throw new ApiError(
      413,
      "file_too_large",
      "File exceeds the 100 MB limit.",
    );
  }
  const mimeType = input.file.type || "application/octet-stream";
  if (FORMAT_DENYLIST.has(mimeType)) {
    throw new ApiError(415, "format_not_allowed", "This file format is not accepted.");
  }

  const body = Buffer.from(await input.file.arrayBuffer());
  const sourceId = randomUUID();
  const versionId = randomUUID();
  const objectKey = `${sourceId}/${versionId}`;

  // Bytes land in the object store first; the DB transaction then makes the
  // item `stored` — store-first: it is findable and downloadable immediately,
  // extraction has not run yet (extraction_status stays `pending`).
  await putObject(objectKey, body, mimeType);

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
  });

  extractionWorker.enqueue(versionId, input.extractionMethod ?? "auto");
  return getSourceDetail(actor, sourceId);
}

/**
 * Store-first Library list: only storage_state matters; extraction never
 * gates. `folderId` scopes to one folder (null = the space root) and is only
 * meaningful with `spaceId`. `archived` flips the view to withdrawn items —
 * Admin/Op only, the restore screen's read.
 */
export async function listLibrary(
  actor: Principal,
  opts: {
    spaceId?: string;
    q?: string;
    page?: number;
    folderId?: string | null;
    categoryId?: string;
    sort?: "title" | "storedAt";
    dir?: "asc" | "desc";
    archived?: boolean;
  },
) {
  const visible = scopedToSpaces(actor);
  if (opts.spaceId) {
    authorize(actor, "storage.library.browse", { spaceId: opts.spaceId, kind: "read" });
  }
  if (opts.archived) {
    authorize(actor, "storage.source.read_all", { kind: "read" }); // admin_op
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

  // Folder scoping only exists inside one space; without spaceId the list is
  // cross-space and folders are not a meaningful axis.
  const folderFilter =
    opts.spaceId && opts.folderId !== undefined
      ? opts.folderId === null
        ? isNull(sources.folderId)
        : eq(sources.folderId, opts.folderId)
      : undefined;

  // Books live here with no stored file, so the version join is LEFT and the
  // sort falls back to the source's own creation time.
  const sortCol =
    opts.sort === "title"
      ? sources.title
      : sql`coalesce(${sourceVersions.storedAt}, ${sources.createdAt})`;
  const order = (opts.dir ?? "desc") === "asc" ? asc(sortCol) : desc(sortCol);

  const page = Math.max(1, opts.page ?? 1);
  return db
    .select({
      sourceId: sources.id,
      spaceId: sources.spaceId,
      spaceName: spaces.name,
      folderId: sources.folderId,
      categoryId: sources.categoryId,
      categoryName: categories.name,
      title: sources.title,
      submitterName: users.displayName,
      mimeType: sourceVersions.mimeType,
      storedAt: sourceVersions.storedAt,
      extractionStatus: sourceVersions.extractionStatus,
      // `processed` with zero chunks is the stub lying; the chip needs the truth.
      hasText: sql<boolean>`EXISTS (SELECT 1 FROM ${textChunks} WHERE ${textChunks.sourceVersionId} = ${sourceVersions.id})`,
      itemCode: sourcePhysical.itemCode,
      physicalStatus: sourcePhysical.status,
    })
    .from(sources)
    .leftJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .leftJoin(
      sourcePhysical,
      and(eq(sourcePhysical.sourceId, sources.id), isNull(sourcePhysical.archivedAt)),
    )
    .leftJoin(categories, eq(sources.categoryId, categories.id))
    .innerJoin(spaces, eq(sources.spaceId, spaces.id))
    .innerJoin(users, eq(sources.submittedBy, users.id))
    .where(
      and(
        opts.archived
          ? eq(sourceVersions.storageState, "archived")
          : // A row belongs on the shelf if its file is stored, or it is a
            // book (physical, no file) that is not retired.
            sql`(${sourceVersions.storageState} = 'stored'
                 OR (${sources.currentVersionId} IS NULL AND ${sourcePhysical.id} IS NOT NULL))`,
        spaceFilter,
        folderFilter,
        opts.categoryId ? eq(sources.categoryId, opts.categoryId) : undefined,
        textMatch,
      ),
    )
    .orderBy(order)
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
  // Out-of-scope read → 404, never 403.
  authorize(actor, "storage.library.browse", { spaceId: row.source.spaceId, kind: "read" });

  const [{ chunkCount }] = row.version
    ? await db
        .select({ chunkCount: sql<number>`count(*)::int` })
        .from(textChunks)
        .where(eq(textChunks.sourceVersionId, row.version.id))
    : [{ chunkCount: 0 }];

  // The whole version chain, newest first — the detail page's history table.
  // One extra query on a page that already makes three; a dedicated
  // listSourceVersions service + route would be more code for the same rows.
  const versions = await db
    .select({
      seq: sourceVersions.seq,
      filename: sourceVersions.originalFilename,
      storedAt: sourceVersions.storedAt,
      uploadedByName: users.displayName,
    })
    .from(sourceVersions)
    .innerJoin(users, eq(sourceVersions.uploadedBy, users.id))
    .where(eq(sourceVersions.sourceId, sourceId))
    .orderBy(desc(sourceVersions.seq));

  return {
    id: row.source.id,
    spaceId: row.source.spaceId,
    spaceName: row.spaceName,
    folderId: row.source.folderId,
    versions,
    title: row.source.title,
    description: row.source.description,
    trustStatus: row.source.trustStatus,
    submittedBy: row.source.submittedBy,
    assignedTo: row.source.assignedTo,
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
          extractionMeta: row.version.extractionMeta as {
            engine?: string;
            error?: string;
            requestedMethod?: ExtractionMethod;
          } | null,
          storedAt: row.version.storedAt,
          chunkCount,
          hasText: chunkCount > 0,
        }
      : null,
  };
}

/**
 * Authorized download: checks scope, then issues the signed-URL substitute
 * (short-lived token for exactly one object key) the route 302-redirects to.
 * Never a public path.
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
    throw new ApiError(400, "invalid_title", "Title must not be empty.");
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
 * Refused once anything is published from it: at that point it is no longer
 * just your upload — a promoted page's provenance depends on it.
 */
export async function withdrawSource(actor: Principal, sourceId: string) {
  const row = await loadOwnedSource(actor, sourceId, "write");
  if (row.version.storageState !== "stored") {
    throw new ApiError(409, "not_stored", "This item is not in a withdrawable state.");
  }

  const [published] = await db
    .select({ id: promotions.id })
    .from(promotions)
    .where(eq(promotions.sourceVersionId, row.version.id));
  if (published) {
    throw new ApiError(
      409,
      "source_in_use",
      "Cannot withdraw: published content depends on this source. Contact an administrator.",
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

/**
 * The way back from withdraw. The confirm dialog has promised "quản trị viên
 * có thể khôi phục nếu cần" since the withdraw screen shipped; until now that
 * sentence was a lie — nothing ever set storage_state back to `stored`.
 */
export async function restoreSource(actor: Principal, sourceId: string) {
  authorize(actor, "storage.source.read_all", { kind: "write" }); // admin_op
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.id, sourceId));
  if (!row) throw notFound();
  if (row.version.storageState !== "archived") {
    throw new ApiError(409, "not_archived", "This item is not withdrawn.");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(sourceVersions)
      .set({ storageState: "stored" })
      .where(eq(sourceVersions.id, row.version.id));
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "source.restore",
      targetType: "source",
      targetId: sourceId,
      details: { spaceId: row.source.spaceId, versionId: row.version.id },
    });
  });
}

/**
 * File a source in a folder (null = the space root). Same ownership rule as
 * rename — filing your own upload is fixing your own record. The folder must
 * be in the source's own space: cross-space moves change who can see the
 * bytes, which is a different decision with different stakes, and stays
 * unbuilt on purpose.
 */
export async function moveSource(actor: Principal, sourceId: string, folderId: string | null) {
  const row = await loadOwnedSource(actor, sourceId, "write");
  if (folderId) {
    const [folder] = await db
      .select({ id: folders.id, spaceId: folders.spaceId })
      .from(folders)
      .where(eq(folders.id, folderId));
    if (!folder) throw new ApiError(400, "unknown_folder", "Folder does not exist.");
    if (folder.spaceId !== row.source.spaceId) {
      throw new ApiError(400, "folder_other_space", "The folder belongs to a different space.");
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .update(sources)
      .set({ folderId, updatedAt: new Date(), version: row.source.version + 1 })
      .where(eq(sources.id, sourceId));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.move",
      targetType: "source",
      targetId: sourceId,
      details: { from: row.source.folderId, to: folderId },
    });
  });
}

/**
 * A corrected copy of the same document. seq was hardcoded to 1 in the only
 * insert, with no route to add a second — so a researcher who fixed a typo in
 * their own scan had to withdraw and re-upload, severing every derivation.
 * The new version becomes current; extraction re-runs; the old versions stay,
 * which is the entire point of having them.
 */
export async function addSourceVersion(actor: Principal, sourceId: string, file: File) {
  const row = await loadOwnedSource(actor, sourceId, "write");
  if (row.version.storageState !== "stored") {
    throw new ApiError(409, "not_stored", "New versions can only be added to a stored item.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ApiError(
      413,
      "file_too_large",
      "File exceeds the 100 MB limit.",
    );
  }
  const mimeType = file.type || "application/octet-stream";
  if (FORMAT_DENYLIST.has(mimeType)) {
    throw new ApiError(415, "format_not_allowed", "This file format is not accepted.");
  }

  const body = Buffer.from(await file.arrayBuffer());
  const versionId = randomUUID();
  const objectKey = `sources/${sourceId}/${versionId}/${file.name}`;
  await putObject(objectKey, body, mimeType);

  await db.transaction(async (tx) => {
    // max(seq)+1 inside the transaction; two simultaneous re-uploads of the
    // same source are a human impossibility at this team size, but the unique
    // (source_id, seq) constraint would still catch the race with a 500 rather
    // than silent corruption. // ponytail: no retry loop.
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${sourceVersions.seq}), 0)` })
      .from(sourceVersions)
      .where(eq(sourceVersions.sourceId, sourceId));
    await tx.insert(sourceVersions).values({
      id: versionId,
      sourceId,
      seq: max + 1,
      originalObjectKey: objectKey,
      originalFilename: file.name,
      mimeType,
      sizeBytes: body.byteLength,
      checksumSha256: createHash("sha256").update(body).digest("hex"),
      storageState: "stored",
      uploadedBy: actor.userId,
      storedAt: new Date(),
    });
    await tx
      .update(sources)
      .set({ currentVersionId: versionId, updatedAt: new Date() })
      .where(eq(sources.id, sourceId));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.version.add",
      targetType: "source",
      targetId: sourceId,
      details: { versionId, seq: max + 1, filename: file.name },
    });
  });

  extractionWorker.enqueue(versionId);
  return getSourceDetail(actor, sourceId);
}

/** The member's own uploads, newest first. */
export async function mySubmissions(actor: Principal) {
  authorize(actor, "storage.submissions.read", { userId: actor.userId, kind: "read" });
  const sourceRows = await db
    .select({
      submissionId: sources.id,
      title: sources.title,
      storageState: sourceVersions.storageState,
      extractionStatus: sourceVersions.extractionStatus,
      lastUpdatedAt: sources.updatedAt,
    })
    .from(sources)
    .leftJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.submittedBy, actor.userId));
  return sourceRows
    .map((r) => ({ itemType: "source" as const, ...r }))
    .sort(
      (a, b) =>
        new Date(b.lastUpdatedAt ?? 0).getTime() - new Date(a.lastUpdatedAt ?? 0).getTime(),
    );
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
  if (!name) throw new ApiError(400, "invalid_space", "Space name must not be empty.");

  return db.transaction(async (tx) => {
    const [space] = await tx
      .insert(spaces)
      .values({ name, type: "team", createdBy: actor.userId })
      .returning({ id: spaces.id, name: spaces.name, type: spaces.type });
    await tx
      .insert(spaceMembers)
      .values({
        spaceId: space.id,
        userId: actor.userId,
        memberRole: "manager",
        addedBy: actor.userId,
      });
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
    .where(
      visible !== null ? (visible.length ? inArray(spaces.id, visible) : sql`false`) : undefined,
    )
    .orderBy(spaces.name);
  return rows;
}

// --- Membership ------------------------------------------------------------
// The screen these serve is the one the createSpace comment promised: until it
// existed, a fresh install had no Kho and the storage product was unreachable
// without the seed script.

/** Members of one space, with names — the admin membership panel's read. */
export async function listSpaceMembers(actor: Principal, spaceId: string) {
  authorize(actor, "storage.space.members.manage", { spaceId, kind: "read" });
  return db
    .select({
      userId: users.id,
      displayName: users.displayName,
      role: users.role,
      memberRole: spaceMembers.memberRole,
    })
    .from(spaceMembers)
    .innerJoin(users, eq(spaceMembers.userId, users.id))
    .where(eq(spaceMembers.spaceId, spaceId))
    .orderBy(asc(users.displayName));
}

export async function addSpaceMember(
  actor: Principal,
  spaceId: string,
  userId: string,
  memberRole: "viewer" | "contributor" | "manager" = "contributor",
) {
  authorize(actor, "storage.space.members.manage", { spaceId, kind: "write" });
  const [space] = await db.select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId));
  if (!space) throw notFound();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));
  if (!user) throw new ApiError(400, "unknown_user", "User does not exist.");
  await db.transaction(async (tx) => {
    // Re-adding an existing member is a no-op, not an error: the admin's goal
    // ("this person is in the space") is already true.
    await tx
      .insert(spaceMembers)
      .values({ spaceId, userId, memberRole, addedBy: actor.userId })
      .onConflictDoNothing();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "space.member.add",
      targetType: "space",
      targetId: spaceId,
      details: { userId, memberRole },
    });
  });
}

export async function removeSpaceMember(actor: Principal, spaceId: string, userId: string) {
  authorize(actor, "storage.space.members.manage", { spaceId, kind: "write" });
  await db.transaction(async (tx) => {
    await tx
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, userId)));
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "space.member.remove",
      targetType: "space",
      targetId: spaceId,
      details: { userId },
    });
  });
}

export async function setSpaceMemberRole(
  actor: Principal,
  spaceId: string,
  userId: string,
  memberRole: "viewer" | "contributor" | "manager",
) {
  authorize(actor, "storage.space.members.manage", { spaceId, kind: "write" });
  await db.transaction(async (tx) => {
    const [membership] = await tx
      .update(spaceMembers)
      .set({ memberRole })
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, userId)))
      .returning();
    if (!membership) throw notFound();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "space.member.role.change",
      targetType: "space",
      targetId: spaceId,
      details: { userId, memberRole },
    });
  });
}

// --- Folders ---------------------------------------------------------------
// Drive-shaped filing inside a space. NULL parent / NULL sources.folder_id is
// the space root; drizzle/0003 carries the name-unique-per-parent rules.

/** The pg unique violation for a duplicate folder name, said in words. */
function rethrowFolderNameTaken(err: unknown): never {
  const raw = err as { code?: string; cause?: { code?: string } };
  if (raw?.code === "23505" || raw?.cause?.code === "23505") {
    throw new ApiError(409, "folder_exists", "A folder with this name already exists here.");
  }
  throw err;
}

/** Flat rows for one space; the page builds the tree/breadcrumb itself. */
export async function listFolders(actor: Principal, spaceId: string) {
  authorize(actor, "storage.library.browse", { spaceId, kind: "read" });
  return db
    .select({ id: folders.id, parentId: folders.parentId, name: folders.name })
    .from(folders)
    .where(eq(folders.spaceId, spaceId))
    .orderBy(asc(folders.name));
}

/**
 * Any member of the space can make a folder — filing things is what members
 * do there; storage.upload is exactly that gate, not an admin one.
 */
export async function createFolder(
  actor: Principal,
  input: { spaceId: string; parentId?: string | null; name: string },
) {
  authorize(actor, "storage.upload", { spaceId: input.spaceId, kind: "write" });
  const name = input.name?.trim();
  if (!name) throw new ApiError(400, "invalid_folder", "Folder name must not be empty.");
  const parentId = input.parentId || null;
  if (parentId) {
    const [parent] = await db
      .select({ id: folders.id, spaceId: folders.spaceId })
      .from(folders)
      .where(eq(folders.id, parentId));
    if (!parent || parent.spaceId !== input.spaceId) {
      throw new ApiError(400, "unknown_folder", "Parent folder does not exist in this space.");
    }
  }
  try {
    return await db.transaction(async (tx) => {
      const [folder] = await tx
        .insert(folders)
        .values({ spaceId: input.spaceId, parentId, name, createdBy: actor.userId })
        .returning({ id: folders.id, parentId: folders.parentId, name: folders.name });
      await recordAudit(tx, actor, {
        accountability: "uploader",
        action: "folder.create",
        targetType: "folder",
        targetId: folder.id,
        details: { spaceId: input.spaceId, parentId, name },
      });
      return folder;
    });
  } catch (err) {
    rethrowFolderNameTaken(err);
  }
}

/** Load + gate: the creator fixes their own folder; Admin/Op passes on role. */
async function loadOwnedFolder(actor: Principal, folderId: string) {
  const [folder] = await db.select().from(folders).where(eq(folders.id, folderId));
  if (!folder) throw notFound();
  authorize(actor, "storage.source.manage", { ownerIds: [folder.createdBy], kind: "write" });
  return folder;
}

export async function renameFolder(actor: Principal, folderId: string, name: string) {
  const folder = await loadOwnedFolder(actor, folderId);
  const next = name?.trim();
  if (!next) throw new ApiError(400, "invalid_folder", "Folder name must not be empty.");
  try {
    await db.transaction(async (tx) => {
      await tx.update(folders).set({ name: next }).where(eq(folders.id, folderId));
      await recordAudit(tx, actor, {
        accountability: "uploader",
        action: "folder.rename",
        targetType: "folder",
        targetId: folderId,
        details: { from: folder.name, to: next },
      });
    });
  } catch (err) {
    rethrowFolderNameTaken(err);
  }
}

/**
 * Only an empty folder goes: refusing while anything is inside means delete
 * can never silently unfile someone else's documents.
 * ponytail: no moveFolder — reorganising nesting = create new + move sources
 * + delete old; revisit if anyone asks.
 */
export async function deleteFolder(actor: Principal, folderId: string) {
  const folder = await loadOwnedFolder(actor, folderId);
  const [child] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.parentId, folderId))
    .limit(1);
  const [filed] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.folderId, folderId))
    .limit(1);
  if (child || filed) {
    throw new ApiError(409, "folder_not_empty", "The folder still contains items.");
  }
  await db.transaction(async (tx) => {
    await tx.delete(folders).where(eq(folders.id, folderId));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "folder.delete",
      targetType: "folder",
      targetId: folderId,
      details: { spaceId: folder.spaceId, name: folder.name },
    });
  });
}

/** Every enabled member — the "add someone" picker on the membership panel. */
export async function listAllMembers(actor: Principal) {
  authorize(actor, "storage.space.manage", { kind: "read" });
  return db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(asc(users.displayName));
}
