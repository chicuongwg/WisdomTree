import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { loanTickets } from "../circulation/schema";
import { catalogItems } from "./schema";

/** Exported so the Catalog page's pager agrees with the query's LIMIT. */
export const CATALOG_PAGE_SIZE = 24;
const PAGE_SIZE = CATALOG_PAGE_SIZE;
const ACTIVE_LOAN_STATES = ["requested", "approved", "borrowed", "overdue"] as const;

/**
 * Add a physical item to the catalogue. Until this existed the catalogue could
 * only be populated by the seed script, so a real library's `/catalog` was
 * permanently empty.
 *
 * `item_code` is unique and formatted LIB-000001; it is generated here rather
 * than typed by the librarian, from the current maximum. ponytail: a
 * max()+1 under one operator is fine, and the unique index is the real
 * guarantee — swap in a sequence if two people ever catalogue at once.
 */
export async function createCatalogItem(
  actor: Principal,
  input: { title?: string; author?: string; location?: string; spaceId?: string },
) {
  authorize(actor, "catalog.item.manage", { kind: "write" });
  const title = input.title?.trim();
  if (!title) throw new ApiError(400, "invalid_item", "Vui lòng nhập tên đầu sách.");
  if (!input.spaceId) throw new ApiError(400, "invalid_item", "Vui lòng chọn kho cho đầu sách.");

  return db.transaction(async (tx) => {
    const [{ maxCode }] = await tx
      .select({ maxCode: sql<string | null>`max(${catalogItems.itemCode})` })
      .from(catalogItems);
    const next = Number(maxCode?.replace(/^LIB-/, "") ?? 0) + 1;
    const [item] = await tx
      .insert(catalogItems)
      .values({
        itemCode: `LIB-${String(next).padStart(6, "0")}`,
        title,
        author: input.author?.trim() || null,
        location: input.location?.trim() || null,
        spaceId: input.spaceId!,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.create",
      targetType: "catalog_item",
      targetId: item.id,
      details: { itemCode: item.itemCode, spaceId: item.spaceId },
    });
    return item;
  });
}

export async function listCatalog(actor: Principal, opts: { q?: string; page?: number }) {
  const visible = scopedToSpaces(actor);
  const q = opts.q?.trim();
  const page = Math.max(1, opts.page ?? 1);
  return db
    .select({
      id: catalogItems.id,
      itemCode: catalogItems.itemCode,
      title: catalogItems.title,
      author: catalogItems.author,
      location: catalogItems.location,
      status: catalogItems.status,
      spaceId: catalogItems.spaceId,
    })
    .from(catalogItems)
    .where(
      and(
        visible !== null
          ? visible.length
            ? inArray(catalogItems.spaceId, visible)
            : sql`false`
          : undefined,
        q
          ? sql`(to_tsvector('simple', immutable_unaccent(${catalogItems.title} || ' ' || coalesce(${catalogItems.author}, '')))
                 @@ plainto_tsquery('simple', immutable_unaccent(${q}))
               OR ${catalogItems.itemCode} ILIKE ${"%" + q + "%"})`
          : undefined,
      ),
    )
    .orderBy(catalogItems.itemCode)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
}

export async function getCatalogItem(actor: Principal, itemId: string) {
  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!item) throw notFound();
  // Out-of-scope read → 404 (authorization-design.md).
  authorize(actor, "catalog.browse", { spaceId: item.spaceId, kind: "read" });

  const [activeLoan] = await db
    .select()
    .from(loanTickets)
    .where(and(eq(loanTickets.itemId, item.id), inArray(loanTickets.state, [...ACTIVE_LOAN_STATES])))
    .orderBy(desc(loanTickets.createdAt))
    .limit(1);

  return { ...item, activeLoan: activeLoan ?? null };
}
