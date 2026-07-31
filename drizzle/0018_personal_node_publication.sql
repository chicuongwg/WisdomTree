CREATE TABLE node_publication_proposals (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id           uuid NOT NULL REFERENCES tree_nodes(id),
  source_node_version      int NOT NULL,
  source_version_id        uuid REFERENCES source_versions(id),
  target_branch_id         uuid NOT NULL REFERENCES branches(id),
  title                    text NOT NULL,
  content_md               text NOT NULL,
  tags                     jsonb NOT NULL DEFAULT '[]'::jsonb
                           CHECK (jsonb_typeof(tags) = 'array'),
  links                    jsonb NOT NULL DEFAULT '[]'::jsonb
                           CHECK (jsonb_typeof(links) = 'array'),
  snapshot_sha256          text NOT NULL,
  created_by               uuid NOT NULL REFERENCES users(id),
  state                    text NOT NULL DEFAULT 'pending'
                           CHECK (state IN ('pending', 'approved', 'rejected', 'changes_requested')),
  decision_note            text,
  approved_node_version_id uuid REFERENCES tree_node_versions(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (state <> 'approved' OR approved_node_version_id IS NOT NULL)
);

CREATE UNIQUE INDEX node_publication_one_pending_per_source
  ON node_publication_proposals(source_node_id)
  WHERE state = 'pending';
CREATE INDEX node_publication_target_state_idx
  ON node_publication_proposals(target_branch_id, state, created_at);

CREATE FUNCTION protect_node_publication_snapshot()
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
     OR NEW.snapshot_sha256 <> OLD.snapshot_sha256
     OR NEW.created_by <> OLD.created_by
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'node publication snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER node_publication_snapshot_immutable
BEFORE UPDATE ON node_publication_proposals
FOR EACH ROW EXECUTE FUNCTION protect_node_publication_snapshot();

ALTER TABLE content_reviews
  ADD COLUMN publication_proposal_id uuid REFERENCES node_publication_proposals(id);

ALTER TABLE content_reviews DROP CONSTRAINT content_reviews_target_type_check;
ALTER TABLE content_reviews
  ADD CONSTRAINT content_reviews_target_type_check
  CHECK (target_type IN ('source_draft', 'node_proposal', 'personal_node_publication'));

ALTER TABLE content_reviews DROP CONSTRAINT content_reviews_check;
ALTER TABLE content_reviews
  ADD CONSTRAINT content_reviews_target_check
  CHECK (
    (target_type = 'source_draft'
      AND source_version_id IS NOT NULL
      AND proposal_id IS NULL
      AND publication_proposal_id IS NULL)
    OR
    (target_type = 'node_proposal'
      AND proposal_id IS NOT NULL
      AND source_version_id IS NULL
      AND publication_proposal_id IS NULL)
    OR
    (target_type = 'personal_node_publication'
      AND publication_proposal_id IS NOT NULL
      AND source_version_id IS NULL
      AND proposal_id IS NULL)
  );

CREATE UNIQUE INDEX content_reviews_one_pending_publication
  ON content_reviews(publication_proposal_id)
  WHERE target_type = 'personal_node_publication' AND state = 'pending';

CREATE OR REPLACE FUNCTION protect_content_review_snapshot()
RETURNS trigger AS $$
BEGIN
  IF NEW.target_type <> OLD.target_type
     OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
     OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
     OR NEW.publication_proposal_id IS DISTINCT FROM OLD.publication_proposal_id
     OR NEW.content_sha256 <> OLD.content_sha256
     OR NEW.originator_id <> OLD.originator_id
     OR NEW.last_editor_id <> OLD.last_editor_id
     OR NEW.submitted_by <> OLD.submitted_by
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'content review snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE review_tasks DROP CONSTRAINT review_tasks_target_type_check;
ALTER TABLE review_tasks
  ADD CONSTRAINT review_tasks_target_type_check
  CHECK (target_type IN (
    'source_version',
    'branch_gap_request',
    'markdown_draft',
    'tree_node',
    'node_publication_proposal',
    'conflict'
  ));
