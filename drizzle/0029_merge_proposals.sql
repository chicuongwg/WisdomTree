-- 0029 — the twin proposal tables become one. node_change_proposals and
-- node_publication_proposals shared title/content/tags/links/created_by and
-- the whole state enum; they differed only in what the proposal points at.
-- One table with a kind column says that directly: kind='change' edits an
-- existing promoted node (node_id = that node), kind='publication' promotes
-- a personal node (node_id = the source, target_branch_id = destination).
CREATE TABLE node_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('change', 'publication')),
  node_id uuid NOT NULL REFERENCES tree_nodes(id),
  base_version integer NOT NULL,
  source_version_id uuid REFERENCES source_versions(id),
  target_branch_id uuid REFERENCES branches(id),
  title text NOT NULL,
  content_md text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]',
  links jsonb NOT NULL DEFAULT '[]',
  created_by uuid NOT NULL REFERENCES users(id),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'approved', 'rejected', 'changes_requested')),
  decision_note text,
  decided_by uuid REFERENCES users(id),
  approved_node_version_id uuid REFERENCES tree_node_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'publication') = (target_branch_id IS NOT NULL))
);

INSERT INTO node_proposals
  (id, kind, node_id, base_version, title, content_md, tags, links, created_by, state, created_at, updated_at)
SELECT id, 'change', node_id, base_version, title, content_md, tags, links, created_by, state, created_at, created_at
FROM node_change_proposals;

INSERT INTO node_proposals
  (id, kind, node_id, base_version, source_version_id, target_branch_id, title, content_md,
   tags, links, created_by, state, decision_note, decided_by, approved_node_version_id, created_at, updated_at)
SELECT id, 'publication', source_node_id, source_node_version, source_version_id, target_branch_id, title, content_md,
       tags, links, created_by, state, decision_note, decided_by, approved_node_version_id, created_at, updated_at
FROM node_publication_proposals;

DROP TABLE node_change_proposals;
DROP TABLE node_publication_proposals;
