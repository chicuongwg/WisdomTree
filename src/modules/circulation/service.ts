import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { sources, sourcePhysical } from "../storage/schema";
import { users } from "../auth/schema";
import { loanTickets } from "./schema";
import { kickDispatch } from "../notify/dispatcher";

// Loan lifecycle: requested → approved → borrowed → returned (+ declined).
// Every transition writes the ticket, the item when its status changes,
// audit_events, and outbox_events in ONE transaction; the outbox dispatcher
// then turns loan events into in-app notifications.
// Borrower-initiated actions audit as `member`; librarian actions as
// `operator`. Items are the Library's physical rows (source_physical); the
// public entry points speak sourceId, the id the Library screens carry.

/** Tickets that are holding a copy right now — the ones that count against
 *  `copies`. A declined or returned ticket has put its book back. */
export const ACTIVE_LOAN_STATES = ["requested", "approved", "borrowed", "overdue"] as const;

export async function activeLoanCount(runner: Tx | typeof db, itemId: string): Promise<number> {
  const [row] = await runner
    .select({ n: sql<number>`count(*)::int` })
    .from(loanTickets)
    .where(
      and(eq(loanTickets.itemId, itemId), inArray(loanTickets.state, [...ACTIVE_LOAN_STATES])),
    );
  return row?.n ?? 0;
}

async function loadItemBySource(runner: Tx | typeof db, sourceId: string) {
  const [row] = await runner
    .select({ item: sourcePhysical, spaceId: sources.spaceId, sourceId: sources.id })
    .from(sourcePhysical)
    .innerJoin(sources, eq(sourcePhysical.sourceId, sources.id))
    .where(eq(sourcePhysical.sourceId, sourceId));
  if (!row) throw notFound();
  return row;
}

export async function requestLoan(actor: Principal, sourceId: string) {
  const { item, spaceId } = await loadItemBySource(db, sourceId);
  authorize(actor, "circulation.loan.request", { spaceId, kind: "write" });

  // A retired title cannot be borrowed; archivePhysicalItem guards the other
  // direction (it refuses while a copy is out).
  if (item.archivedAt) {
    throw new ApiError(409, "item_archived", "This title is archived and cannot be borrowed.");
  }
  // Lost and in-repair are facts about the whole title and stop every copy.
  if (item.status === "lost" || item.status === "repair") {
    throw new ApiError(409, "item_unavailable", "This title is not available for borrowing.");
  }
  // "You already have one" is asked BEFORE "are there any left": the answer is
  // about the reader rather than the shelf, and the two are easy to confuse.
  const [mine] = await db
    .select({ id: loanTickets.id })
    .from(loanTickets)
    .where(
      and(
        eq(loanTickets.itemId, item.id),
        eq(loanTickets.borrowerId, actor.userId),
        inArray(loanTickets.state, [...ACTIVE_LOAN_STATES]),
      ),
    );
  if (mine) {
    throw new ApiError(409, "loan_already_active", "You already have an active loan for this title.");
  }
  if ((await activeLoanCount(db, item.id)) >= item.copies) {
    throw new ApiError(
      409,
      "item_unavailable",
      "All copies of this title are on loan.",
    );
  }

  const ticket = await db.transaction(async (tx) => {
    // The unique index is the real guard against ONE person requesting the
    // same title twice; the copy count is checked again here, inside the
    // transaction, so two people racing for the last copy cannot both win.
    if ((await activeLoanCount(tx, item.id)) >= item.copies) {
      throw new ApiError(
        409,
        "item_unavailable",
        "All copies of this title are on loan.",
      );
    }
    const [created] = await tx
      .insert(loanTickets)
      .values({ itemId: item.id, borrowerId: actor.userId, requestedAt: new Date() })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "loan.request",
      targetType: "loan_ticket",
      targetId: created.id,
      details: { itemId: item.id, sourceId },
    });
    await emitOutbox(tx, "loan.requested", {
      ticketId: created.id,
      itemId: item.id,
      sourceId,
      borrowerId: actor.userId,
    });
    // Requesting the last copy takes the title off the shelf immediately.
    await syncItemStatus(tx, item.id);
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
    throw new ApiError(
      409,
      "invalid_state",
      "The loan ticket is not in a state that allows this action.",
    );
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

/**
 * Recompute a title's shelf status from how many of its copies are out —
 * borrowed once every copy is spoken for, available while one is left —
 * inside the same transaction as the ticket that changed. Lost and in-repair
 * are a librarian's statement and are never touched here.
 */
async function syncItemStatus(tx: Tx, itemId: string): Promise<void> {
  const [item] = await tx.select().from(sourcePhysical).where(eq(sourcePhysical.id, itemId));
  if (!item) throw notFound();
  if (item.status === "lost" || item.status === "repair") return;
  const status = (await activeLoanCount(tx, itemId)) >= item.copies ? "borrowed" : "available";
  if (status === item.status) return; // nothing moved; do not burn a version
  const [updated] = await tx
    .update(sourcePhysical)
    .set({ status, updatedAt: new Date(), version: item.version + 1 })
    .where(and(eq(sourcePhysical.id, item.id), eq(sourcePhysical.version, item.version)))
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
          throw new ApiError(400, "invalid_due_date", "Please provide a valid due date.");
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
    const [itemRow] = await tx
      .select({ sourceId: sourcePhysical.sourceId })
      .from(sourcePhysical)
      .where(eq(sourcePhysical.id, ticket.itemId));
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
      sourceId: itemRow?.sourceId ?? null,
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

/** Loan-desk queue: all tickets, newest first, with item and borrower. */
export async function listTickets(actor: Principal, states?: TicketRow["state"][]) {
  authorize(actor, "circulation.loan.manage", { kind: "read" });
  return db
    .select({
      ticket: loanTickets,
      sourceId: sourcePhysical.sourceId,
      itemTitle: sources.title,
      itemCode: sourcePhysical.itemCode,
      borrowerName: users.displayName,
    })
    .from(loanTickets)
    .innerJoin(sourcePhysical, eq(loanTickets.itemId, sourcePhysical.id))
    .innerJoin(sources, eq(sourcePhysical.sourceId, sources.id))
    .innerJoin(users, eq(loanTickets.borrowerId, users.id))
    .where(states?.length ? inArray(loanTickets.state, states) : undefined)
    .orderBy(desc(loanTickets.updatedAt));
}

/**
 * The loan REGISTER for one Library item, newest first: every ticket the item
 * has ever carried, each with the borrower and the librarian who handled it.
 * Authorization is the item's NORMAL read: catalog.browse on the item's
 * space — a member reading a shelf record is a read of the item.
 */
export async function listTicketsForItem(actor: Principal, sourceId: string) {
  const { item, spaceId } = await loadItemBySource(db, sourceId);
  authorize(actor, "storage.library.browse", { spaceId, kind: "read" });

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
    .where(eq(loanTickets.itemId, item.id))
    .orderBy(desc(loanTickets.requestedAt), desc(loanTickets.createdAt));
}

export type ItemLoanRecord = Awaited<ReturnType<typeof listTicketsForItem>>[number];

/** A member's own tickets (shown on Library item detail / home). */
export async function myTickets(actor: Principal) {
  return db
    .select({
      ticket: loanTickets,
      sourceId: sourcePhysical.sourceId,
      itemTitle: sources.title,
      itemCode: sourcePhysical.itemCode,
    })
    .from(loanTickets)
    .innerJoin(sourcePhysical, eq(loanTickets.itemId, sourcePhysical.id))
    .innerJoin(sources, eq(sourcePhysical.sourceId, sources.id))
    .where(eq(loanTickets.borrowerId, actor.userId))
    .orderBy(desc(loanTickets.updatedAt));
}
