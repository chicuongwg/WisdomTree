# Catalog and Circulation

## Purpose
- Specify the physical library catalog and its borrow-return circulation for the community library project, so a non-technical librarian can inventory and lend roughly one thousand books through the platform.
- Keep the physical catalog distinct from digital storage while allowing gradual digitization to link the two.

## In Scope
- The `Catalog Item` entity for physical book copies and its inventory lifecycle.
- The `Loan Ticket` entity for borrow-return circulation.
- Initial inventory import, identifier assignment, and the optional link from a physical copy to a digitized `Source`.

## Out of Scope
- Digitizing book content; the catalog records metadata only, not full text.
- General digital file storage, which stays in [`two-repository-architecture.md`](./two-repository-architecture.md).
- Notification delivery mechanics, which live in [`notifications.md`](./notifications.md).

## Decisions
- The physical catalog is a separate module (`catalog`) from digital storage; circulation is a further module (`circulation`) that depends on it.
- A `Catalog Item` represents one physical copy and carries an auto-issued unique identifier, cover title, author, optional cover photo, shelf location, and status. It does not store book content.
- Circulation is a lightweight approve-borrow-return workflow suitable for a small community library, not a full ILS.
- A `Catalog Item` may optionally link to a `Source` when the copy is later digitized, bridging the physical and digital layers.
- Identifiers are stable and printable so a QR or barcode label can be attached later; QR scanning is an enhancement, not a V1 requirement.

## Dependencies
- Platform framing in [`../platform/platform-context.md`](../platform/platform-context.md) and [`../platform/module-map.md`](../platform/module-map.md).
- Glossary terms in [`../product/glossary.md`](../product/glossary.md).
- Lifecycle conventions in [`../flows/state-machines.md`](../flows/state-machines.md).
- Google Sheets import path in [`google-bridge.md`](./google-bridge.md).

## Acceptance Criteria
- A librarian can add a book, assign it a unique identifier, and find it later by title, author, or identifier.
- A member can request to borrow a book, and a librarian can approve, mark borrowed, and mark returned, with overdue items visible.
- The catalog can be bulk-loaded from a spreadsheet of the existing roughly one-thousand-book collection.
- A digitized copy can be linked to its physical catalog item without merging the two records.

## Entities

### Catalog Item
- Represents one physical copy in the library.
- Fields:
  - `item_id`: auto-issued stable unique identifier, printable as a label.
  - `title`: cover title.
  - `author`: author as printed.
  - `cover_photo`: optional image reference.
  - `location`: shelf or zone label.
  - `status`: `available`, `borrowed`, `lost`, or `repair`.
  - `space`: the space that owns the library collection.
  - `linked_source`: optional reference to a `Source` if the copy has been digitized.
- Does not store book content or full text.

### Loan Ticket
- Represents one borrow-return cycle for one `Catalog Item`.
- Fields:
  - `ticket_id`
  - `item_id`
  - `borrower`: the requesting user.
  - `state`: see the loan lifecycle.
  - `requested_at`, `approved_at`, `borrowed_at`, `due_at`, `returned_at`.
  - `handled_by`: the librarian who approved or closed the loan.
- One catalog item has at most one active loan ticket at a time.

## Catalog Item Lifecycle
- `available`: in the collection and free to borrow.
- `borrowed`: currently out on an active loan ticket.
- `lost`: recorded as missing; retained in history, not discoverable as borrowable.
- `repair`: temporarily withdrawn for maintenance.
- Transitions are made by a librarian, except `available` to `borrowed` and back, which are driven by the loan lifecycle.

## Loan Ticket Lifecycle
- `requested`: a member asked to borrow the item.
- `approved`: a librarian approved the request; the item is reserved.
- `borrowed`: the item is physically handed over; `due_at` is set.
- `returned`: the item came back; the item returns to `available`.
- `overdue`: a borrowed loan passed `due_at`; it remains a loan until returned and drives a reminder.
- A request may also be declined before approval, closing the ticket without a loan.

## Inventory Import
- The existing collection of roughly one thousand books is bulk-loaded from a spreadsheet through the Google Sheets import path in [`google-bridge.md`](./google-bridge.md).
- Import assigns each row a new `item_id`, maps title, author, and location columns, and defaults status to `available`.
- Rows that fail validation are reported for manual correction and do not partially create items.

## Digitization Bridge
- When a physical book is scanned, the resulting file enters digital storage as a `Source` in the library space.
- The `Catalog Item` for that copy sets `linked_source` to the new source, so a member viewing the catalog item can open the digitized version when it exists.
- The two records stay distinct: the catalog item tracks the physical copy and its circulation; the source tracks the digital evidence and its extraction.

## Permissions Summary
- Any authenticated member of the library space can browse the catalog and request to borrow.
- Borrow approval, marking borrowed and returned, editing catalog items, and managing lost or repair status are librarian actions, held by `Admin/Op` acting as the library's content admin.
- Cross-space visibility of another space's catalog stays with `Admin/Op`.
- Full role-by-action detail lives in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).
