-- 0041 — optional research purpose and version-specific supporting evidence.
-- Existing demo/legacy notes remain unclassified and receive no support rows.

ALTER TABLE tree_nodes ADD COLUMN research_purpose text;
ALTER TABLE tree_nodes ADD CONSTRAINT tree_nodes_research_purpose_check
  CHECK (research_purpose IS NULL OR research_purpose IN ('evidence', 'synthesis'));

ALTER TABLE node_drafts ADD COLUMN research_purpose text;
ALTER TABLE node_drafts ADD CONSTRAINT node_drafts_research_purpose_check
  CHECK (research_purpose IS NULL OR research_purpose IN ('evidence', 'synthesis'));

CREATE TABLE draft_support_source_versions (
  draft_id uuid NOT NULL REFERENCES node_drafts(id) ON DELETE CASCADE,
  source_version_id uuid NOT NULL REFERENCES source_versions(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, source_version_id)
);
CREATE INDEX draft_support_source_versions_source_idx
  ON draft_support_source_versions(source_version_id);

CREATE TABLE draft_support_note_versions (
  draft_id uuid NOT NULL REFERENCES node_drafts(id) ON DELETE CASCADE,
  note_version_id uuid NOT NULL REFERENCES tree_node_versions(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id, note_version_id)
);
CREATE INDEX draft_support_note_versions_version_idx
  ON draft_support_note_versions(note_version_id);

CREATE TABLE note_support_source_versions (
  node_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  source_version_id uuid NOT NULL REFERENCES source_versions(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, source_version_id)
);
CREATE INDEX note_support_source_versions_source_idx
  ON note_support_source_versions(source_version_id);

CREATE TABLE note_support_note_versions (
  node_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  note_version_id uuid NOT NULL REFERENCES tree_node_versions(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, note_version_id)
);
CREATE INDEX note_support_note_versions_version_idx
  ON note_support_note_versions(note_version_id);
