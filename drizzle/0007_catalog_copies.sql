-- Batch K: a title can be more than one book.
--
-- The catalogue modelled a title and a copy as the same row: one `status`
-- column, one active loan allowed per item. A library that owns three copies
-- of Truyện Kiều had to enter it three times, and lending one marked all of
-- them borrowed. `copies` is how many physical books sit on the shelf under
-- that item code (owner decision 2026-07-21).
ALTER TABLE catalog_items ADD COLUMN copies integer NOT NULL DEFAULT 1;
ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_copies_positive CHECK (copies >= 1);

-- The old index said "one active loan per item", which with three copies on
-- the shelf refused the second borrower. What must stay unique is one active
-- loan per PERSON per title: three people may each hold a copy, and no one
-- holds two of the same book. How many copies are left is a COUNT against
-- `copies`, enforced in circulation/service.ts inside the same transaction.
DROP INDEX loan_tickets_one_active_per_item;
CREATE UNIQUE INDEX loan_tickets_one_active_per_borrower
  ON loan_tickets (item_id, borrower_id)
  WHERE state IN ('requested', 'approved', 'borrowed', 'overdue');
