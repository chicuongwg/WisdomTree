import assert from "node:assert/strict";
import { ApiError } from "@/lib/errors";
import {
  archivePhysicalItem,
  createPhysicalItem,
  getPhysicalDetail,
  listCategories,
  updatePhysicalItem,
} from "@/modules/storage/physical";
import { listLibrary } from "@/modules/storage/service";
import {
  approveLoan,
  borrowLoan,
  declineLoan,
  requestLoan,
  returnLoan,
} from "@/modules/circulation/service";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { spaces } from "@/modules/storage/schema";
import { principalFor } from "../setup";

// The guard rails of the book/loan merge: creation is admin-only, a book
// without a file still appears in the Library under category "Sách", and
// the copies-vs-loans arithmetic refuses the states that would lie about
// the shelf.

const code = (c: string) => (err: unknown) => err instanceof ApiError && err.code === c;

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const member = await principalFor("lan@wisdomtree.local");
  // The shared community-library space every seeded member belongs to.
  const [libraryRow] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Thư Viện Cộng Đồng"));
  assert.ok(libraryRow);
  const librarySpace = libraryRow.id;

  // Creation is admin-only.
  await assert.rejects(
    createPhysicalItem(member, { title: "Forbidden", spaceId: librarySpace }),
    code("forbidden"),
  );
  const book = await createPhysicalItem(admin, {
    title: `Sổ tay kiểm thử ${Date.now()}`,
    author: "Tác giả Test",
    location: "Kệ T1",
    spaceId: librarySpace,
    copies: 2,
  });
  assert.match(book.itemCode, /^LIB-\d{6}$/);

  // The book is a Library item in category "Sách" even though it has no file.
  const bookCategory = (await listCategories()).find((c) => c.name === "Sách");
  assert.ok(bookCategory);
  const shelf = await listLibrary(member, { categoryId: bookCategory.id, sort: "title" });
  assert.ok(
    shelf.some((item) => item.sourceId === book.sourceId),
    "the new book must appear in the member's Library under Sách",
  );

  // Loans: request → approve → borrow eats one copy; the same borrower
  // cannot hold two tickets for one title.
  const ticket = await requestLoan(member, book.sourceId);
  await assert.rejects(requestLoan(member, book.sourceId), code("loan_already_active"));
  await approveLoan(admin, ticket.id);
  await borrowLoan(admin, ticket.id, new Date(Date.now() + 7 * 86_400_000));
  const midLoan = await getPhysicalDetail(member, book.sourceId);
  assert.ok(midLoan);
  assert.equal(midLoan.availableCopies, 1);
  assert.equal(midLoan.hasMyActiveLoan, true);

  // Copies must be a positive integer.
  await assert.rejects(
    updatePhysicalItem(admin, book.sourceId, { copies: 0 }),
    code("invalid_copies"),
  );

  // Second member takes the last copy → all copies out for a third request,
  // and a request from that borrower is declinable (hands the copy back).
  const member2 = await principalFor("duc@wisdomtree.local");
  const ticket2 = await requestLoan(member2, book.sourceId);
  await approveLoan(admin, ticket2.id);
  await borrowLoan(admin, ticket2.id, new Date(Date.now() + 7 * 86_400_000));
  const editor = await principalFor("minh@wisdomtree.local");
  await assert.rejects(requestLoan(editor, book.sourceId), code("item_unavailable"));

  // With BOTH copies out, the count cannot drop below the number on loan;
  // the refusal carries the count in details for the FE translator.
  await assert.rejects(updatePhysicalItem(admin, book.sourceId, { copies: 1 }), (err: unknown) => {
    assert.ok(err instanceof ApiError && err.code === "copies_below_active_loans");
    assert.equal(err.details?.onLoan, 2);
    return true;
  });
  // …and the title cannot be archived while copies are out.
  await assert.rejects(archivePhysicalItem(admin, book.sourceId), code("copies_on_loan"));

  // Returns close the loop; then the title can be archived, and an archived
  // title refuses new loans. A declined request also hands its copy back
  // (exercised via a fresh request after one return).
  await returnLoan(admin, ticket.id);
  const oneBack = await requestLoan(member, book.sourceId);
  await declineLoan(admin, oneBack.id);
  await returnLoan(admin, ticket2.id);
  const returned = await getPhysicalDetail(member, book.sourceId);
  assert.equal(returned?.availableCopies, 2);
  await archivePhysicalItem(admin, book.sourceId);
  await assert.rejects(requestLoan(member, book.sourceId), code("item_archived"));
}
