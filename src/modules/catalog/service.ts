import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { notFound } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { loanTickets } from "../circulation/schema";
import { catalogItems } from "./schema";

const PAGE_SIZE = 24;
const ACTIVE_LOAN_STATES = ["requested", "approved", "borrowed", "overdue"] as const;

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
