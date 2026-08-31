CREATE TABLE node_translations (
  node_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('en')),
  title text NOT NULL,
  summary text,
  content_md text NOT NULL,
  slug text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, locale)
);

CREATE TABLE node_translation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL,
  locale text NOT NULL,
  seq integer NOT NULL,
  title text NOT NULL,
  summary text,
  content_md text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, locale, seq),
  FOREIGN KEY (node_id, locale) REFERENCES node_translations(node_id, locale) ON DELETE CASCADE
);

CREATE TABLE node_translation_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('en')),
  base_version integer NOT NULL,
  title text NOT NULL,
  summary text,
  content_md text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'approved', 'rejected', 'changes_requested')),
  decision_note text,
  decided_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX node_translation_one_pending_idx
  ON node_translation_proposals (node_id, locale)
  WHERE state = 'pending';

CREATE INDEX node_translation_review_idx
  ON node_translation_proposals (state, created_at);
