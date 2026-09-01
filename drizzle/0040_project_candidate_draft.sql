-- 0040 — trace target extraction evolution to its author-private Project draft.
-- Project remains derived through candidate -> source version -> source.

ALTER TABLE extraction_candidates ADD COLUMN evolved_draft_id uuid;
ALTER TABLE extraction_candidates
  ADD CONSTRAINT extraction_candidates_evolved_draft_id_node_drafts_id_fk
  FOREIGN KEY (evolved_draft_id) REFERENCES node_drafts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX extraction_candidates_evolved_draft_id_key
  ON extraction_candidates (evolved_draft_id)
  WHERE evolved_draft_id IS NOT NULL;

-- 0028 removed vault_id but left the 0012 immutable-content trigger reading
-- NEW.vault_id, which makes every lifecycle update fail at runtime.
CREATE OR REPLACE FUNCTION protect_extraction_candidate_content()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_version_id <> OLD.source_version_id
     OR NEW.content_md <> OLD.content_md
     OR NEW.content_sha256 <> OLD.content_sha256
     OR NEW.method <> OLD.method
     OR NEW.created_by <> OLD.created_by
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'extraction candidate content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
