import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { loanTickets } from "../circulation/schema";
import { ACTIVE_LOAN_STATES } from "../circulation/service";
import { catalogItems } from "./schema";

/** Exported so the Catalog page's pager agrees with the query's LIMIT. */
export const CATALOG_PAGE_SIZE = 24;
const PAGE_SIZE = CATALOG_PAGE_SIZE;

/**
 * How many of a title's copies are in someone's hands right now, as a
 * correlated subquery so it can ride along with a list of items.
 *
 * The states come from circulation, which owns the meaning of "still holding a
 * copy"; this module must never keep a second, drifting copy of that list.
 */
const onLoanCount = sql<number>`(
  select count(*)::int from ${loanTickets}
  where ${loanTickets.itemId} = ${catalogItems.id}
    and ${loanTickets.state} in (${sql.join(
      ACTIVE_LOAN_STATES.map((state) => sql`${state}`),
      sql`, `,
    )})
)`;

/**
 * The number a librarian may type into the quantity box.
 *
 * The database CHECK is the backstop, not the message: a person who types "0"
 * or "hai" should be told what to type instead, not shown a constraint name.
 */
function parseCopies(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const copies = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(copies) || copies < 1) {
    throw new ApiError(400, "invalid_copies", "Số lượng phải là số nguyên từ 1 trở lên.");
  }
  return copies;
}

async function activeLoanCount(runner: Tx | typeof db, itemId: string): Promise<number> {
  const [row] = await runner
    .select({ n: sql<number>`count(*)::int` })
    .from(loanTickets)
    .where(
      and(eq(loanTickets.itemId, itemId), inArray(loanTickets.state, [...ACTIVE_LOAN_STATES])),
    );
  return row?.n ?? 0;
}

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
  input: { title?: string; author?: string; location?: string; spaceId?: string; copies?: unknown },
) {
  authorize(actor, "catalog.item.manage", { kind: "write" });
  const title = input.title?.trim();
  if (!title) throw new ApiError(400, "invalid_item", "Vui lòng nhập tên đầu sách.");
  if (!input.spaceId) throw new ApiError(400, "invalid_item", "Vui lòng chọn kho cho đầu sách.");
  const copies = parseCopies(input.copies);

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
        copies,
        spaceId: input.spaceId!,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.create",
      targetType: "catalog_item",
      targetId: item.id,
      details: { itemCode: item.itemCode, spaceId: item.spaceId, copies: item.copies },
    });
    return item;
  });
}

/**
 * Change how many physical books sit under one item code.
 *
 * A librarian who loses a book will try to set copies from 3 to 2 while all
 * three are out, and the honest answer is not a CHECK violation: it is that the
 * shelf cannot hold fewer books than the number people are currently holding.
 * The count is taken inside the transaction against the row we are about to
 * write, so a loan granted mid-edit cannot slip under the guard.
 *
 * ponytail: copies is the only field this edits. Title, author and location
 * have no edit screen yet either; widen this the day one is asked for, rather
 * than shipping a generic patch nobody calls.
 */
export async function updateCatalogItemCopies(
  actor: Principal,
  itemId: string,
  input: { copies?: unknown },
) {
  authorize(actor, "catalog.item.manage", { kind: "write" });
  const copies = parseCopies(input.copies);

  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(catalogItems).where(eq(catalogItems.id, itemId));
    if (!item) throw notFound();
    const onLoan = await activeLoanCount(tx, itemId);
    if (copies < onLoan) {
      throw new ApiError(
        409,
        "copies_below_active_loans",
        `Hiện có ${onLoan} cuốn chưa được trả, nên số lượng không thể nhỏ hơn ${onLoan}. Hãy nhận lại sách rồi giảm số lượng.`,
      );
    }
    // The same derivation circulation makes after every transition: fewer or
    // more copies moves the shelf line just as a loan does. Lost and in-repair
    // are a librarian's statement about the books and stay untouched.
    const status =
      item.status === "lost" || item.status === "repair"
        ? item.status
        : onLoan >= copies
          ? ("borrowed" as const)
          : ("available" as const);
    const [updated] = await tx
      .update(catalogItems)
      .set({ copies, status, updatedAt: new Date(), version: item.version + 1 })
      .where(and(eq(catalogItems.id, item.id), eq(catalogItems.version, item.version)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.update",
      targetType: "catalog_item",
      targetId: item.id,
      details: { itemCode: item.itemCode, from: item.copies, to: copies },
    });
    return { ...updated, availableCopies: Math.max(updated.copies - onLoan, 0) };
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
      copies: catalogItems.copies,
      // What the shelf can hand over today. One index lookup on
      // loan_tickets(item_id) per row, 24 rows to a page — cheaper than the
      // catalogue's own full-text predicate, and the alternative (a GROUP BY
      // join) costs the same lookups while making the pager's LIMIT lie.
      availableCopies: sql<number>`greatest(${catalogItems.copies} - ${onLoanCount}, 0)`,
    })
    .from(catalogItems)
    .where(
      and(
        // A retired title is off the shelf list entirely.
        isNull(catalogItems.archivedAt),
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
  // A retired title reads as gone: 404, the same answer a link to a deleted
  // page gives, rather than a page that exists but can never be borrowed.
  if (!item || item.archivedAt) throw notFound();
  // Out-of-scope read → 404 (authorization-design.md).
  authorize(actor, "catalog.browse", { spaceId: item.spaceId, kind: "read" });

  const [activeLoan] = await db
    .select()
    .from(loanTickets)
    .where(
      and(eq(loanTickets.itemId, item.id), inArray(loanTickets.state, [...ACTIVE_LOAN_STATES])),
    )
    .orderBy(desc(loanTickets.createdAt))
    .limit(1);

  // `activeLoan` is only ever ONE of the tickets out against this title now, so
  // it can no longer answer "is anything left" — the count does.
  const onLoan = await activeLoanCount(db, item.id);
  return {
    ...item,
    activeLoan: activeLoan ?? null,
    availableCopies: Math.max(item.copies - onLoan, 0),
  };
}

/**
 * Retire a catalogue entry — a title the library no longer holds, or one
 * entered by mistake. Archived rather than deleted, because a title that has
 * ever been borrowed has loan tickets pointing at it and deleting the row
 * would leave that history dangling.
 *
 * Refused while a copy is still out: "we no longer hold this" cannot be true
 * of a book somebody is carrying, and hiding the title would hide the loan
 * with it. Idempotent otherwise, so a second click is not an error.
 */
export async function archiveCatalogItem(actor: Principal, itemId: string) {
  authorize(actor, "catalog.item.manage", { kind: "write" });
  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!item) throw notFound();
  if (item.archivedAt) return item;
  const out = await activeLoanCount(db, itemId);
  if (out > 0) {
    throw new ApiError(
      409,
      "copies_on_loan",
      `Hiện có ${out} cuốn chưa được trả, chưa thể lưu trữ đầu sách này. Hãy nhận lại sách trước.`,
    );
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(catalogItems)
      .set({ archivedAt: new Date(), updatedAt: new Date(), version: item.version + 1 })
      .where(and(eq(catalogItems.id, itemId), eq(catalogItems.version, item.version)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "catalog.item.archive",
      targetType: "catalog_item",
      targetId: itemId,
      details: { itemCode: item.itemCode, title: item.title },
    });
    return updated;
  });
}
