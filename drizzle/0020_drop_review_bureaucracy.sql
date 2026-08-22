-- Two-tier edit model: live edits on personal branches, ONE review boundary
-- at promotion (node_change_proposals / node_publication_proposals stay).
-- The 5-state curation overlay, its review bookkeeping, the gap-request
-- workflow, and the docx/pdf render job infrastructure all go. The
-- publication proposal gains decided_by, replacing what content_reviews
-- recorded about who approved.
DROP VIEW IF EXISTS intake_items;
DROP TABLE IF EXISTS review_tasks;
DROP TABLE IF EXISTS conflicts;
DROP TABLE IF EXISTS content_reviews;
DROP TABLE IF EXISTS markdown_drafts;
DROP TABLE IF EXISTS curations;
DROP TABLE IF EXISTS corrected_texts;
DROP TABLE IF EXISTS branch_gap_requests;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS export_jobs;
ALTER TABLE node_publication_proposals DROP COLUMN snapshot_sha256;
ALTER TABLE node_publication_proposals ADD COLUMN decided_by uuid REFERENCES users(id);
ALTER TABLE node_change_proposals DROP COLUMN content_sha256;

-- The 0018 snapshot-immutability trigger referenced snapshot_sha256; without
-- this rewrite every UPDATE on the table errors on the dropped column.
CREATE OR REPLACE FUNCTION protect_node_publication_snapshot()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_node_id <> OLD.source_node_id
     OR NEW.source_node_version <> OLD.source_node_version
     OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
     OR NEW.target_branch_id <> OLD.target_branch_id
     OR NEW.title <> OLD.title
     OR NEW.content_md <> OLD.content_md
     OR NEW.tags <> OLD.tags
     OR NEW.links <> OLD.links
     OR NEW.created_by <> OLD.created_by
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'node publication snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
