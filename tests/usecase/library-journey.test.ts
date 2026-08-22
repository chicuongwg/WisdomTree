import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { spaces } from "@/modules/storage/schema";
import { createPhysicalItem, getPhysicalDetail, listCategories } from "@/modules/storage/physical";
import { getSourceDetail, listLibrary } from "@/modules/storage/service";
import {
  approveLoan,
  borrowLoan,
  listTickets,
  listTicketsForItem,
  myTickets,
  requestLoan,
  returnLoan,
} from "@/modules/circulation/service";
import { principalFor } from "../setup";

// USE CASE — a physical book's life in the Library, end to end:
// the admin shelves it, a member finds it under the "Sách" category,
// borrows it across the full ticket state machine, both sides can see the
// truth of who holds what, and the register keeps the history.

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const member = await principalFor("lan@wisdomtree.local");
  const [libraryRow] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Thư Viện Cộng Đồng"));
  assert.ok(libraryRow);

  // 1. Admin shelves a new book (source row + shelf facts, one transaction).
  const title = `Truyện cổ dân gian ${Date.now()}`;
  const book = await createPhysicalItem(admin, {
    title,
    author: "Nhiều tác giả",
    location: "Kệ B2",
    spaceId: libraryRow.id,
    copies: 1,
  });

  // 2. The member finds it: in the Library list under category "Sách", and
  // its detail page carries both halves (source + shelf).
  const sach = (await listCategories()).find((c) => c.name === "Sách");
  assert.ok(sach);
  const shelf = await listLibrary(member, { categoryId: sach.id, q: "Truyện cổ" });
  assert.ok(shelf.some((i) => i.sourceId === book.sourceId && i.itemCode === book.itemCode));
  const detail = await getSourceDetail(member, book.sourceId);
  assert.equal(detail.title, title);
  assert.equal(detail.currentVersion, null, "a book has no stored file");

  // 3. Borrow across the state machine; each side sees the truth.
  const ticket = await requestLoan(member, book.sourceId);
  assert.equal(ticket.state, "requested");
  const desk = await listTickets(admin, ["requested"]);
  assert.ok(desk.some((t) => t.ticket.id === ticket.id && t.itemTitle === title));

  await approveLoan(admin, ticket.id);
  const due = new Date(Date.now() + 14 * 86_400_000);
  await borrowLoan(admin, ticket.id, due);
  const mine = await myTickets(member);
  const held = mine.find((t) => t.ticket.id === ticket.id);
  assert.equal(held?.ticket.state, "borrowed");
  assert.equal(held?.sourceId, book.sourceId);
  const midLoan = await getPhysicalDetail(member, book.sourceId);
  assert.equal(midLoan?.availableCopies, 0);
  assert.equal(midLoan?.status, "borrowed");

  // 4. Return: the shelf recovers, and the per-item register keeps the
  // whole story (borrower and handler by name).
  await returnLoan(admin, ticket.id);
  const after = await getPhysicalDetail(member, book.sourceId);
  assert.equal(after?.availableCopies, 1);
  assert.equal(after?.status, "available");
  const register = await listTicketsForItem(member, book.sourceId);
  const entry = register.find((r) => r.ticket.id === ticket.id);
  assert.equal(entry?.ticket.state, "returned");
  assert.equal(entry?.borrowerName, "Trần Thị Lan");
  assert.equal(entry?.handlerName, "Phạm Thu Hương");
}
