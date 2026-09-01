-- 0045 — stable per-Note public publication identity and immutable revisions.
-- Existing demo Notes are not published or backfilled.

CREATE TABLE note_publications (
  note_id uuid PRIMARY KEY REFERENCES tree_nodes(id) ON DELETE RESTRICT,
  public_slug text NOT NULL UNIQUE,
  current_revision_id uuid,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (note_id, public_slug)
);

CREATE TABLE note_public_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES tree_nodes(id) ON DELETE RESTRICT,
  revision_number int NOT NULL CHECK (revision_number > 0),
  source_note_version_id uuid NOT NULL REFERENCES tree_node_versions(id) ON DELETE RESTRICT,
  title text NOT NULL,
  summary text,
  content_md text NOT NULL,
  published_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  published_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_public_revisions_note_revision_key UNIQUE (note_id, revision_number),
  CONSTRAINT note_public_revisions_note_source_key UNIQUE (note_id, source_note_version_id),
  CONSTRAINT note_public_revisions_note_id_id_key UNIQUE (note_id, id),
  CONSTRAINT note_public_revisions_publication_fk
    FOREIGN KEY (note_id) REFERENCES note_publications(note_id) ON DELETE RESTRICT
);

ALTER TABLE note_publications
  ADD CONSTRAINT note_publications_current_revision_fk
  FOREIGN KEY (note_id, current_revision_id)
  REFERENCES note_public_revisions(note_id, id)
  ON DELETE RESTRICT;

CREATE INDEX note_publications_current_revision_idx
  ON note_publications(current_revision_id);
CREATE INDEX note_public_revisions_source_version_idx
  ON note_public_revisions(source_note_version_id);

CREATE FUNCTION enforce_note_public_revision_source()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tree_node_versions v
    WHERE v.id = NEW.source_note_version_id AND v.node_id = NEW.note_id
  ) THEN
    RAISE EXCEPTION 'public revision source version must belong to the same note';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER note_public_revisions_source_note
  BEFORE INSERT ON note_public_revisions
  FOR EACH ROW EXECUTE FUNCTION enforce_note_public_revision_source();

CREATE TRIGGER note_public_revisions_append_only
  BEFORE UPDATE OR DELETE ON note_public_revisions
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
