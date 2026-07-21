-- A catalogue entry can be retired.
--
-- Every other record in this app can end: a task archives, a branch archives,
-- a node archives. A book title could not, so a mistyped entry — or a title the
-- library no longer holds — stayed on the shelf list forever with no way to
-- take it off. Discovered by needing it: verifying the copies feature left two
-- test titles in the catalogue and there was no honest way to remove them.
--
-- Archived, never deleted: a title that has been borrowed has loan tickets
-- pointing at it, and deleting the row would leave that history dangling. The
-- reads filter it out; the record keeps it.
ALTER TABLE catalog_items ADD COLUMN archived_at timestamptz;
CREATE INDEX catalog_items_live ON catalog_items (space_id) WHERE archived_at IS NULL;
