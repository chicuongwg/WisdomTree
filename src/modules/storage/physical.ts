import { and, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { loanTickets } from "../circulation/schema";
import { ACTIVE_LOAN_STATES, activeLoanCount } from "../circulation/service";
import { requireProjectLibraryOperator } from "../project/capabilities";
import { getObject, putObject } from "./object-store";
import { categories, sources, sourcePhysical } from "./schema";
import { requireProjectMaterial } from "./service";

// Physical items ("sách giấy") inside the Library: a source row carries the
// title/space/category, source_physical carries the shelf facts, and the loan
// workflow (circulation) hangs off the physical row. The old standalone
// catalog module folded into this file; everything is keyed by sourceId — the
// id the Library screens already speak.

const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const BOOK_CATEGORY_NAME = "Sách";

/**
 * The number a librarian may type into the quantity box.
 * The database CHECK is the backstop, not the message.
 */
function parseCopies(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const copies = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(copies) || copies < 1) {
    throw new ApiError(400, "invalid_copies", "Copies must be an integer of at least 1.");
  }
  return copies;
}

/** Physical row + owning source, by the source id the routes carry. */
async function loadPhysical(runner: Tx | typeof db, sourceId: string) {
  const [row] = await runner
    .select({ physical: sourcePhysical, source: sources })
    .from(sourcePhysical)
    .innerJoin(sources, eq(sourcePhysical.sourceId, sources.id))
    .where(eq(sourcePhysical.sourceId, sourceId));
  if (!row) throw notFound();
  return row;
}

export async function listCategories() {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(categories.name);
}

/**
 * Add a physical book to the Library: one transaction creating the source row
 * (category "Sách") and its physical facts. `item_code` is generated
 * LIB-000001-style from the current maximum; the unique index is the real
 * guarantee.
 */
export async function createPhysicalItem(
  actor: Principal,
  input: { title?: string; author?: string; location?: string; spaceId?: string; copies?: unknown },
) {
  authorize(actor, "library.physical.manage", { kind: "write" });
  const title = input.title?.trim();
  if (!title) throw new ApiError(400, "invalid_item", "A title is required.");
  if (!input.spaceId) throw new ApiError(400, "invalid_item", "A space is required.");
  const copies = parseCopies(input.copies);

  return db.transaction(async (tx) => {
    const [category] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, BOOK_CATEGORY_NAME));
    const [source] = await tx
      .insert(sources)
      .values({
        spaceId: input.spaceId!,
        title,
        categoryId: category?.id ?? null,
        submittedBy: actor.userId,
      })
      .returning();
    const [{ maxCode }] = await tx
      .select({ maxCode: sql<string | null>`max(${sourcePhysical.itemCode})` })
      .from(sourcePhysical);
    const next = Number(maxCode?.replace(/^LIB-/, "") ?? 0) + 1;
    const [item] = await tx
      .insert(sourcePhysical)
      .values({
        sourceId: source.id,
        itemCode: `LIB-${String(next).padStart(6, "0")}`,
        author: input.author?.trim() || null,
        location: input.location?.trim() || null,
        copies,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.create",
      targetType: "source_physical",
      targetId: item.id,
      details: { itemCode: item.itemCode, sourceId: source.id, spaceId: source.spaceId, copies },
    });
    return { ...item, sourceId: source.id, title: source.title };
  });
}

/** Attach shelf facts to an existing Project Material without creating a second Source. */
export async function addProjectMaterialPhysical(
  actor: Principal,
  input: {
    projectId: string;
    sourceId: string;
    author?: string;
    location?: string;
    copies?: unknown;
  },
) {
  const source = await requireProjectMaterial(input.projectId, input.sourceId);
  await requireProjectLibraryOperator(actor, input.projectId);
  const copies = parseCopies(input.copies);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: sourcePhysical.id })
      .from(sourcePhysical)
      .where(eq(sourcePhysical.sourceId, source.id));
    if (existing) {
      throw new ApiError(409, "physical_exists", "This Material already has physical details.");
    }
    const [category] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, BOOK_CATEGORY_NAME));
    const [{ maxCode }] = await tx
      .select({ maxCode: sql<string | null>`max(${sourcePhysical.itemCode})` })
      .from(sourcePhysical);
    const next = Number(maxCode?.replace(/^LIB-/, "") ?? 0) + 1;
    const [item] = await tx
      .insert(sourcePhysical)
      .values({
        sourceId: source.id,
        itemCode: `LIB-${String(next).padStart(6, "0")}`,
        author: input.author?.trim() || null,
        location: input.location?.trim() || null,
        copies,
        createdBy: actor.userId,
      })
      .returning();
    await tx
      .update(sources)
      .set({
        categoryId: category?.id ?? source.categoryId,
        updatedAt: new Date(),
        version: source.version + 1,
      })
      .where(eq(sources.id, source.id));
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.attach",
      targetType: "source_physical",
      targetId: item.id,
      details: {
        projectId: input.projectId,
        itemCode: item.itemCode,
        sourceId: source.id,
        copies,
      },
    });
    return { ...item, sourceId: source.id, title: source.title };
  });
}

/**
 * Edit the shelf facts: copies (guarded against the number currently out),
 * author, location. Copies below the active-loan count is refused with the
 * honest sentence, not a CHECK violation.
 */
export async function updatePhysicalItem(
  actor: Principal,
  sourceId: string,
  input: { copies?: unknown; author?: string; location?: string },
) {
  authorize(actor, "library.physical.manage", { kind: "write" });

  return db.transaction(async (tx) => {
    const { physical: item } = await loadPhysical(tx, sourceId);
    const copies = input.copies !== undefined ? parseCopies(input.copies) : item.copies;
    const onLoan = await activeLoanCount(tx, item.id);
    if (copies < onLoan) {
      throw new ApiError(
        409,
        "copies_below_active_loans",
        `${onLoan} copies are still out, so the count cannot go below ${onLoan}. Take the books back first.`,
        { onLoan },
      );
    }
    // Same derivation circulation makes after every transition. Lost and
    // in-repair are a librarian's statement about the books and stay untouched.
    const status =
      item.status === "lost" || item.status === "repair"
        ? item.status
        : onLoan >= copies
          ? ("borrowed" as const)
          : ("available" as const);
    const [updated] = await tx
      .update(sourcePhysical)
      .set({
        copies,
        status,
        ...(input.author !== undefined ? { author: input.author.trim() || null } : {}),
        ...(input.location !== undefined ? { location: input.location.trim() || null } : {}),
        updatedAt: new Date(),
        version: item.version + 1,
      })
      .where(and(eq(sourcePhysical.id, item.id), eq(sourcePhysical.version, item.version)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.update",
      targetType: "source_physical",
      targetId: item.id,
      details: { itemCode: item.itemCode, from: item.copies, to: copies },
    });
    return { ...updated, availableCopies: Math.max(updated.copies - onLoan, 0) };
  });
}

/** Store a cover in the object store and keep only its key in DB. */
export async function setPhysicalCover(actor: Principal, sourceId: string, file: File) {
  authorize(actor, "library.physical.manage", { kind: "write" });
  if (!COVER_TYPES.has(file.type)) {
    throw new ApiError(415, "not_an_image", "Cover must be PNG, JPEG or WebP.");
  }
  if (file.size > COVER_MAX_BYTES) {
    throw new ApiError(413, "image_too_large", "Cover image exceeds 5 MB.");
  }
  const { physical: item } = await loadPhysical(db, sourceId);
  if (item.archivedAt) throw notFound();
  const key = `catalog-covers/${item.id}/${Date.now()}`;
  await putObject(key, Buffer.from(await file.arrayBuffer()), file.type);
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(sourcePhysical)
      .set({ coverPhotoKey: key, updatedAt: new Date(), version: item.version + 1 })
      .where(and(eq(sourcePhysical.id, item.id), eq(sourcePhysical.version, item.version)))
      .returning({ id: sourcePhysical.id });
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.cover.set",
      targetType: "source_physical",
      targetId: item.id,
      details: { itemCode: item.itemCode },
    });
  });
}

export async function getPhysicalCover(actor: Principal, sourceId: string) {
  const { physical: item, source } = await loadPhysical(db, sourceId);
  if (item.archivedAt || !item.coverPhotoKey) throw notFound();
  authorize(actor, "storage.library.browse", { spaceId: source.spaceId, kind: "read" });
  return getObject(item.coverPhotoKey).catch(() => null);
}

/**
 * Retire the physical half of a Library item — the shelf no longer holds it.
 * Refused while a copy is still out; idempotent otherwise. The source row and
 * any digital versions stay untouched.
 */
export async function archivePhysicalItem(actor: Principal, sourceId: string) {
  authorize(actor, "library.physical.manage", { kind: "write" });
  const { physical: item } = await loadPhysical(db, sourceId);
  if (item.archivedAt) return item;
  const out = await activeLoanCount(db, item.id);
  if (out > 0) {
    throw new ApiError(
      409,
      "copies_on_loan",
      `${out} copies are still out; the title cannot be archived until they are returned.`,
      { onLoan: out },
    );
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(sourcePhysical)
      .set({ archivedAt: new Date(), updatedAt: new Date(), version: item.version + 1 })
      .where(and(eq(sourcePhysical.id, item.id), eq(sourcePhysical.version, item.version)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.archive",
      targetType: "source_physical",
      targetId: item.id,
      details: { itemCode: item.itemCode },
    });
    return updated;
  });
}

/** The shelf facts + loan availability for one Library item (or null). */
export async function getPhysicalDetail(actor: Principal, sourceId: string) {
  const [row] = await db
    .select({ physical: sourcePhysical, spaceId: sources.spaceId })
    .from(sourcePhysical)
    .innerJoin(sources, eq(sourcePhysical.sourceId, sources.id))
    .where(and(eq(sourcePhysical.sourceId, sourceId), isNull(sourcePhysical.archivedAt)));
  if (!row) return null;
  authorize(actor, "storage.library.browse", { spaceId: row.spaceId, kind: "read" });
  const onLoan = await activeLoanCount(db, row.physical.id);
  const [myActive] = await db
    .select({ id: loanTickets.id })
    .from(loanTickets)
    .where(
      and(
        eq(loanTickets.itemId, row.physical.id),
        eq(loanTickets.borrowerId, actor.userId),
        sql`${loanTickets.state} in (${sql.join(
          ACTIVE_LOAN_STATES.map((state) => sql`${state}`),
          sql`, `,
        )})`,
      ),
    );
  return {
    ...row.physical,
    availableCopies: Math.max(row.physical.copies - onLoan, 0),
    hasMyActiveLoan: Boolean(myActive),
  };
}
