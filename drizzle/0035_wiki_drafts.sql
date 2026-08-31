ALTER TABLE tree_nodes
  ADD COLUMN review_required boolean NOT NULL DEFAULT false;

UPDATE tree_nodes
SET review_required = true
WHERE verification = 'verified' OR publish = true;

CREATE TABLE node_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid REFERENCES tree_nodes(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_version integer NOT NULL DEFAULT 0 CHECK (base_version >= 0),
  draft_version integer NOT NULL DEFAULT 1 CHECK (draft_version > 0),
  title text NOT NULL,
  summary text,
  sort_order integer NOT NULL DEFAULT 0,
  content_md text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
  links jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(links) = 'array'),
  state text NOT NULL DEFAULT 'editing' CHECK (state IN ('editing', 'in_review')),
  submitted_proposal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX node_drafts_existing_owner_locale_idx
  ON node_drafts (node_id, locale, author_id)
  WHERE node_id IS NOT NULL;
CREATE INDEX node_drafts_author_idx ON node_drafts (author_id, updated_at DESC);
CREATE INDEX node_drafts_branch_idx ON node_drafts (branch_id);

ALTER TABLE tree_node_versions
  ADD COLUMN title text,
  ADD COLUMN summary text,
  ADD COLUMN sort_order integer,
  ADD COLUMN tags jsonb,
  ADD COLUMN links jsonb,
  ADD COLUMN publish boolean,
  ADD COLUMN review_required boolean,
  ADD COLUMN snapshot_complete boolean NOT NULL DEFAULT false;

-- Only the latest legacy row can be completed truthfully from current state.
-- Older rows keep snapshot_complete=false and retain their valid content diff.
ALTER TABLE tree_node_versions DISABLE TRIGGER tree_node_versions_append_only;
UPDATE tree_node_versions version
SET title = node.title,
    summary = node.summary,
    sort_order = node.sort_order,
    tags = COALESCE((
      SELECT jsonb_agg(tag.name ORDER BY tag.name)
      FROM node_tags node_tag
      JOIN tags tag ON tag.id = node_tag.tag_id
      WHERE node_tag.node_id = node.id
    ), '[]'::jsonb),
    links = COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('toNodeId', link.to_node_id, 'linkType', link.link_type)
        ORDER BY link.to_node_id, link.link_type
      )
      FROM node_links link
      WHERE link.from_node_id = node.id
    ), '[]'::jsonb),
    publish = node.publish,
    review_required = node.review_required,
    snapshot_complete = true
FROM tree_nodes node
WHERE version.node_id = node.id
  AND version.seq = (
    SELECT max(latest.seq)
    FROM tree_node_versions latest
    WHERE latest.node_id = node.id
  );
ALTER TABLE tree_node_versions ENABLE TRIGGER tree_node_versions_append_only;

ALTER TABLE node_translation_versions
  ADD COLUMN snapshot_complete boolean NOT NULL DEFAULT true;

DROP TABLE node_edit_locks;
