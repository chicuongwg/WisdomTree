-- Frozen content proposals and maker-checker decisions. Existing node
-- revisions remain accepted as legacy; every new shared revision is pending
-- until a review transaction approves it.

ALTER TABLE markdown_drafts ADD COLUMN updated_by uuid REFERENCES users(id);
UPDATE markdown_drafts SET updated_by = created_by;
ALTER TABLE markdown_drafts ALTER COLUMN updated_by SET NOT NULL;

ALTER TABLE tree_node_versions ADD COLUMN review_status text;
ALTER TABLE tree_node_versions DISABLE TRIGGER tree_node_versions_append_only;
UPDATE tree_node_versions SET review_status = 'legacy_accepted';
ALTER TABLE tree_node_versions ENABLE TRIGGER tree_node_versions_append_only;
ALTER TABLE tree_node_versions
  ALTER COLUMN review_status SET NOT NULL,
  ALTER COLUMN review_status SET DEFAULT 'pending',
  ADD CONSTRAINT tree_node_versions_review_status_check
    CHECK (review_status IN ('legacy_accepted', 'pending', 'approved'));

CREATE TABLE node_change_proposals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id       uuid NOT NULL REFERENCES tree_nodes(id),
  base_version  int NOT NULL,
  title         text NOT NULL,
  content_md    text NOT NULL,
  tags          jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
  links         jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array'),
  content_sha256 text NOT NULL,
  created_by    uuid NOT NULL REFERENCES users(id),
  state         text NOT NULL DEFAULT 'pending'
                CHECK (state IN ('pending', 'approved', 'rejected', 'changes_requested')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type     text NOT NULL CHECK (target_type IN ('source_draft', 'node_proposal')),
  source_version_id uuid REFERENCES source_versions(id),
  proposal_id     uuid REFERENCES node_change_proposals(id),
  content_sha256  text NOT NULL,
  originator_id   uuid NOT NULL REFERENCES users(id),
  last_editor_id  uuid NOT NULL REFERENCES users(id),
  submitted_by    uuid NOT NULL REFERENCES users(id),
  state           text NOT NULL DEFAULT 'pending'
                  CHECK (state IN ('pending', 'approved', 'rejected', 'changes_requested')),
  reviewed_by     uuid REFERENCES users(id),
  reviewed_at     timestamptz,
  target_branch_id uuid REFERENCES branches(id),
  target_node_id  uuid REFERENCES tree_nodes(id),
  verification    text CHECK (verification IN ('unverified', 'verified')),
  excerpt_chunk_ids uuid[],
  approved_node_version_id uuid REFERENCES tree_node_versions(id),
  version         int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (target_type = 'source_draft' AND source_version_id IS NOT NULL AND proposal_id IS NULL)
    OR
    (target_type = 'node_proposal' AND proposal_id IS NOT NULL AND source_version_id IS NULL)
  ),
  CHECK (
    state <> 'approved'
    OR (
      reviewed_by IS NOT NULL
      AND reviewed_by <> originator_id
      AND reviewed_by <> last_editor_id
      AND reviewed_by <> submitted_by
      AND approved_node_version_id IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX content_reviews_one_pending_source
  ON content_reviews(source_version_id)
  WHERE target_type = 'source_draft' AND state = 'pending';
CREATE UNIQUE INDEX content_reviews_one_pending_proposal
  ON content_reviews(proposal_id)
  WHERE target_type = 'node_proposal' AND state = 'pending';
CREATE INDEX content_reviews_queue_idx ON content_reviews(state, created_at);

CREATE FUNCTION protect_content_review_snapshot()
RETURNS trigger AS $$
BEGIN
  IF NEW.target_type <> OLD.target_type
     OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
     OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
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

CREATE TRIGGER content_reviews_immutable_snapshot
BEFORE UPDATE ON content_reviews
FOR EACH ROW EXECUTE FUNCTION protect_content_review_snapshot();

CREATE INDEX sources_assigned_idx ON sources(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX curations_assigned_state_idx ON curations(assigned_to, state)
  WHERE assigned_to IS NOT NULL;
CREATE INDEX review_tasks_assigned_state_idx ON review_tasks(assigned_to, state)
  WHERE assigned_to IS NOT NULL;
CREATE INDEX loan_tickets_borrower_state_idx ON loan_tickets(borrower_id, state);

DROP VIEW IF EXISTS intake_items;
