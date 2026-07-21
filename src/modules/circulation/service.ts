import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { catalogItems } from "../catalog/schema";
import { users } from "../auth/schema";
import { loanTickets } from "./schema";
import { kickDispatch } from "../notify/dispatcher";

// Loan lifecycle: requested → approved → borrowed → returned (+ declined).
// Every transition writes the ticket, the item when its status changes,
// audit_events, and outbox_events in ONE transaction; the outbox stub
// dispatcher then turns loan events into in-app notifications.
// Borrower-initiated actions audit as `member` (the baseline member stage
// added by the gate-2 ruling, migration 0001); librarian actions audit as
// `operator`.

export async function requestLoan(actor: Principal, itemId: string) {
  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!item) throw notFound();
  authorize(actor, "circulation.loan.request", { spaceId: item.spaceId, kind: "write" });

  // Lost and in-repair are facts about the whole title and stop every copy.
  if (item.status === "lost" || item.status === "repair") {
    throw new ApiError(409, "item_unavailable", "Đầu sách này hiện không sẵn sàng để mượn.");
  }
  if ((await activeLoanCount(db, itemId)) >= item.copies) {
    throw new ApiError(409, "item_unavailable", "Tất cả bản sao của đầu sách này đang có người mượn.");
  }

  const ticket = await db.transaction(async (tx) => {
    // The unique index is the real guard against ONE person requesting the
    // same title twice; the copy count above is checked again here, inside
    // the transaction, so two people racing for the last copy cannot both win.
    if ((await activeLoanCount(tx, itemId)) >= item.copies) {
      throw new ApiError(409, "item_unavailable", "Tất cả bản sao của đầu sách này đang có người mượn.");
    }
    const [created] = await tx
      .insert(loanTickets)
      .values({ itemId, borrowerId: actor.userId, requestedAt: new Date() })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "loan.request",
      targetType: "loan_ticket",
      targetId: created.id,
      details: { itemId },
    });
    await emitOutbox(tx, "loan.requested", { ticketId: created.id, itemId, borrowerId: actor.userId });
    // Requesting the last copy takes the title off the shelf immediately.
    await syncItemStatus(tx, itemId);
    return created;
  });

  kickDispatch();
  return ticket;
}

type TicketRow = typeof loanTickets.$inferSelect;

async function loadTicket(tx: Tx, ticketId: string): Promise<TicketRow> {
  const [ticket] = await tx.select().from(loanTickets).where(eq(loanTickets.id, ticketId));
  if (!ticket) throw notFound();
  return ticket;
}

function assertState(ticket: TicketRow, expected: TicketRow["state"][]): void {
  if (!expected.includes(ticket.state)) {
    throw new ApiError(409, "invalid_state", "Phiếu mượn không ở trạng thái phù hợp cho thao tác này.");
  }
}

/** Optimistic-locked ticket update: WHERE id AND version, zero rows → 409. */
async function updateTicket(
  tx: Tx,
  ticket: TicketRow,
  patch: Partial<typeof loanTickets.$inferInsert>,
): Promise<TicketRow> {
  const [updated] = await tx
    .update(loanTickets)
    .set({ ...patch, updatedAt: new Date(), version: ticket.version + 1 })
    .where(and(eq(loanTickets.id, ticket.id), eq(loanTickets.version, ticket.version)))
    .returning();
  if (!updated) throw versionConflict();
  return updated;
}

/** Tickets that are holding a copy right now — the ones that count against
 *  `copies`. A declined or returned ticket has put its book back. */
export const ACTIVE_LOAN_STATES = ["requested", "approved", "borrowed", "overdue"] as const;

async function activeLoanCount(runner: Tx | typeof db, itemId: string): Promise<number> {
  const [row] = await runner
    .select({ n: sql<number>`count(*)::int` })
    .from(loanTickets)
    .where(and(eq(loanTickets.itemId, itemId), inArray(loanTickets.state, [...ACTIVE_LOAN_STATES])));
  return row?.n ?? 0;
}

/**
 * Recompute a title's shelf status from how many of its copies are out.
 *
 * "Borrowed" used to be set directly, which was true only while a title WAS a
 * single book: lending one of three copies marked the whole title borrowed and
 * turned the other two away. Now the status is derived — borrowed once every
 * copy is spoken for, available while one is left — and it is recomputed
 * inside the same transaction as the ticket that changed.
 *
 * Lost and in-repair are deliberately untouched: those are a librarian's
 * statement about the books themselves, and no loan returning may quietly
 * declare a lost book available again.
 */
async function syncItemStatus(tx: Tx, itemId: string): Promise<void> {
  const [item] = await tx.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!item) throw notFound();
  if (item.status === "lost" || item.status === "repair") return;
  const status = (await activeLoanCount(tx, itemId)) >= item.copies ? "borrowed" : "available";
  if (status === item.status) return; // nothing moved; do not burn a version
  const [updated] = await tx
    .update(catalogItems)
    .set({ status, updatedAt: new Date(), version: item.version + 1 })
    .where(and(eq(catalogItems.id, item.id), eq(catalogItems.version, item.version)))
    .returning();
  if (!updated) throw versionConflict();
}

async function librarianTransition(
  actor: Principal,
  ticketId: string,
  action: "approve" | "decline" | "borrow" | "return",
  dueAt?: Date,
): Promise<TicketRow> {
  authorize(actor, "circulation.loan.manage", { kind: "write" });

  const result = await db.transaction(async (tx) => {
    const ticket = await loadTicket(tx, ticketId);
    let updated: TicketRow;
    switch (action) {
      case "approve":
        assertState(ticket, ["requested"]);
        updated = await updateTicket(tx, ticket, {
          state: "approved",
          approvedAt: new Date(),
          handledBy: actor.userId,
        });
        break;
      case "decline":
        assertState(ticket, ["requested"]);
        updated = await updateTicket(tx, ticket, { state: "declined", handledBy: actor.userId });
        // A declined request hands its copy back to the shelf.
        await syncItemStatus(tx, ticket.itemId);
        break;
      case "borrow": {
        assertState(ticket, ["approved"]);
        if (!dueAt || Number.isNaN(dueAt.getTime())) {
          throw new ApiError(400, "invalid_due_date", "Vui lòng chọn hạn trả hợp lệ.");
        }
        updated = await updateTicket(tx, ticket, {
          state: "borrowed",
          borrowedAt: new Date(),
          dueAt,
          handledBy: actor.userId,
        });
        await syncItemStatus(tx, ticket.itemId);
        break;
      }
      case "return":
        assertState(ticket, ["borrowed", "overdue"]);
        updated = await updateTicket(tx, ticket, {
          state: "returned",
          returnedAt: new Date(),
          handledBy: actor.userId,
        });
        await syncItemStatus(tx, ticket.itemId);
        break;
    }
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: `loan.${action}`,
      targetType: "loan_ticket",
      targetId: ticket.id,
      details: { itemId: ticket.itemId, from: ticket.state, to: updated.state },
    });
    const eventByAction = {
      approve: "loan.approved",
      decline: "loan.declined",
      borrow: "loan.borrowed",
      return: "loan.returned",
    } as const;
    await emitOutbox(tx, eventByAction[action], {
      ticketId: ticket.id,
      itemId: ticket.itemId,
      borrowerId: ticket.borrowerId,
    });
    return updated;
  });

  kickDispatch();
  return result;
}

export const approveLoan = (actor: Principal, ticketId: string) =>
  librarianTransition(actor, ticketId, "approve");
export const declineLoan = (actor: Principal, ticketId: string) =>
  librarianTransition(actor, ticketId, "decline");
export const borrowLoan = (actor: Principal, ticketId: string, dueAt: Date) =>
  librarianTransition(actor, ticketId, "borrow", dueAt);
export const returnLoan = (actor: Principal, ticketId: string) =>
  librarianTransition(actor, ticketId, "return");

/** Librarian Desk queue: all tickets, newest first, with item and borrower. */
export async function listTickets(actor: Principal, states?: TicketRow["state"][]) {
  authorize(actor, "circulation.loan.manage", { kind: "read" });
  return db
    .select({
      ticket: loanTickets,
      itemTitle: catalogItems.title,
      itemCode: catalogItems.itemCode,
      borrowerName: users.displayName,
    })
    .from(loanTickets)
    .innerJoin(catalogItems, eq(loanTickets.itemId, catalogItems.id))
    .innerJoin(users, eq(loanTickets.borrowerId, users.id))
    .where(states?.length ? inArray(loanTickets.state, states) : undefined)
    .orderBy(desc(loanTickets.updatedAt));
}

/**
 * The loan REGISTER for one catalog item, newest first: every ticket the item
 * has ever carried, each with the borrower and the librarian who handled it.
 *
 * This is what the Catalog Item Detail screen renders instead of a discussion
 * thread (owner decision 2026-07-20): a librarian must be able to answer "ai
 * đang giữ cuốn này và ai đã duyệt" without opening another screen.
 *
 * Authorization is the item's NORMAL read: catalog.browse on the item's space,
 * so an out-of-scope item is a 404 exactly as `getCatalogItem` makes it. No
 * `circulation.loan.manage` here — a member reading a shelf record is a read
 * of the item, not a librarian action.
 */
export async function listTicketsForItem(actor: Principal, itemId: string) {
  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!item) throw notFound();
  authorize(actor, "catalog.browse", { spaceId: item.spaceId, kind: "read" });

  const handler = alias(users, "handler");
  return db
    .select({
      ticket: loanTickets,
      borrowerName: users.displayName,
      handlerName: handler.displayName,
    })
    .from(loanTickets)
    .innerJoin(users, eq(loanTickets.borrowerId, users.id))
    .leftJoin(handler, eq(loanTickets.handledBy, handler.id))
    .where(eq(loanTickets.itemId, itemId))
    .orderBy(desc(loanTickets.requestedAt), desc(loanTickets.createdAt));
}

export type ItemLoanRecord = Awaited<ReturnType<typeof listTicketsForItem>>[number];

/** A member's own tickets (shown on catalog item detail / home). */
export async function myTickets(actor: Principal) {
  return db
    .select({
      ticket: loanTickets,
      itemTitle: catalogItems.title,
      itemCode: catalogItems.itemCode,
    })
    .from(loanTickets)
    .innerJoin(catalogItems, eq(loanTickets.itemId, catalogItems.id))
    .where(eq(loanTickets.borrowerId, actor.userId))
    .orderBy(desc(loanTickets.updatedAt));
}
