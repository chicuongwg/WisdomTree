CREATE TABLE extraction_candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id uuid NOT NULL UNIQUE REFERENCES source_versions(id),
  vault_id          uuid NOT NULL REFERENCES vaults(id),
  content_md        text NOT NULL,
  content_sha256    text NOT NULL,
  method            text NOT NULL CHECK (method IN ('text', 'pandoc', 'ocr')),
  state             text NOT NULL DEFAULT 'pending_review'
                    CHECK (state IN ('pending_review', 'evolved', 'rejected')),
  created_by        uuid NOT NULL REFERENCES users(id),
  reviewed_by       uuid REFERENCES users(id),
  reviewed_at       timestamptz,
  evolved_node_id   uuid REFERENCES tree_nodes(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION protect_extraction_candidate_content()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_version_id <> OLD.source_version_id
     OR NEW.vault_id <> OLD.vault_id
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

CREATE TRIGGER extraction_candidates_immutable_content
BEFORE UPDATE ON extraction_candidates
FOR EACH ROW EXECUTE FUNCTION protect_extraction_candidate_content();
