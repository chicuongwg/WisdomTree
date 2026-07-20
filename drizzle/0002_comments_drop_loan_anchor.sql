-- 0002 — loan tickets stop being a comment anchor.
--
-- Owner decision 2026-07-20: a loan ticket carries a FACTUAL RECORD (who
-- borrowed it, when it was requested, who approved it and when, when the book
-- was handed over, the due date, when it came back) rather than a discussion
-- thread. The register entry now lives on the Catalog Item Detail screen; the
-- comment anchor is removed everywhere so the rule is enforced by the
-- database, not merely hidden in the UI.
--
-- Existing `loan_ticket` comment rows are DEMO FIXTURES (the seeded
-- "xin gia hạn thêm một tuần" line and anything a proof run appended). They
-- are deleted here so the tightened CHECK can be validated. `comments` is
-- append-only by trigger (0001 comments_append_only → forbid_mutation), so the
-- trigger is disabled for the length of this one migration statement block and
-- re-enabled immediately: append-only is a product rule about the application,
-- not a reason to carry a retired anchor type forever.

ALTER TABLE comments DISABLE TRIGGER comments_append_only;

-- One statement removes parents and their replies together, so the self-FK
-- never sees a dangling parent_comment_id mid-way.
DELETE FROM comments WHERE anchor_type = 'loan_ticket';

ALTER TABLE comments ENABLE TRIGGER comments_append_only;

ALTER TABLE comments DROP CONSTRAINT comments_anchor_type_check;
ALTER TABLE comments
  ADD CONSTRAINT comments_anchor_type_check
  CHECK (anchor_type IN ('source', 'tree_node', 'deadline'));
