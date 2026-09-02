-- 0048 — immutable evidence snapshots for exact internal Note versions.
-- The existing node-scoped support tables remain the mutable current projection.

ALTER TABLE tree_node_versions
  ADD COLUMN support_snapshot_complete boolean NOT NULL DEFAULT false;

CREATE TABLE note_version_support_source_versions (
  target_note_version_id uuid NOT NULL
    REFERENCES tree_node_versions(id) ON DELETE RESTRICT,
  source_version_id uuid NOT NULL
    REFERENCES source_versions(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (target_note_version_id, source_version_id)
);

CREATE INDEX note_version_support_source_versions_source_idx
  ON note_version_support_source_versions(source_version_id);

CREATE TABLE note_version_support_note_versions (
  target_note_version_id uuid NOT NULL
    REFERENCES tree_node_versions(id) ON DELETE RESTRICT,
  supporting_note_version_id uuid NOT NULL
    REFERENCES tree_node_versions(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (target_note_version_id, supporting_note_version_id)
);

CREATE INDEX note_version_support_note_versions_support_idx
  ON note_version_support_note_versions(supporting_note_version_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM tree_nodes note
    WHERE note.project_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM tree_node_versions version WHERE version.node_id = note.id
      )
  ) THEN
    RAISE EXCEPTION 'cannot establish support history: Project Note has no official version';
  END IF;
END;
$$;

-- BACKFILL BEGIN: only the latest version can inherit the authoritative current
-- projection. Older historical support remains explicitly unknown.
WITH latest AS (
  SELECT DISTINCT ON (version.node_id) version.id, version.node_id
  FROM tree_node_versions version
  JOIN tree_nodes note ON note.id = version.node_id
  WHERE note.project_id IS NOT NULL
  ORDER BY version.node_id, version.seq DESC
)
INSERT INTO note_version_support_source_versions (
  target_note_version_id,
  source_version_id,
  created_by,
  created_at
)
SELECT latest.id, support.source_version_id, support.created_by, support.created_at
FROM latest
JOIN note_support_source_versions support ON support.node_id = latest.node_id
ON CONFLICT DO NOTHING;

WITH latest AS (
  SELECT DISTINCT ON (version.node_id) version.id, version.node_id
  FROM tree_node_versions version
  JOIN tree_nodes note ON note.id = version.node_id
  WHERE note.project_id IS NOT NULL
  ORDER BY version.node_id, version.seq DESC
)
INSERT INTO note_version_support_note_versions (
  target_note_version_id,
  supporting_note_version_id,
  created_by,
  created_at
)
SELECT latest.id, support.note_version_id, support.created_by, support.created_at
FROM latest
JOIN note_support_note_versions support ON support.node_id = latest.node_id
ON CONFLICT DO NOTHING;

ALTER TABLE tree_node_versions DISABLE TRIGGER tree_node_versions_append_only;
WITH latest AS (
  SELECT DISTINCT ON (version.node_id) version.id
  FROM tree_node_versions version
  JOIN tree_nodes note ON note.id = version.node_id
  WHERE note.project_id IS NOT NULL
  ORDER BY version.node_id, version.seq DESC
)
UPDATE tree_node_versions version
SET support_snapshot_complete = true
FROM latest
WHERE version.id = latest.id;
ALTER TABLE tree_node_versions ENABLE TRIGGER tree_node_versions_append_only;
-- BACKFILL END

-- TreeNodeVersion rows remain append-only except for the one-way transition
-- that seals an evidence snapshot after its relation rows have been inserted.
DROP TRIGGER tree_node_versions_append_only ON tree_node_versions;
CREATE FUNCTION enforce_tree_node_version_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.support_snapshot_complete = false
    AND NEW.support_snapshot_complete = true
    AND (to_jsonb(OLD) - 'support_snapshot_complete') =
        (to_jsonb(NEW) - 'support_snapshot_complete')
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'tree_node_versions is append-only';
END;
$$;

CREATE TRIGGER tree_node_versions_append_only
  BEFORE UPDATE OR DELETE ON tree_node_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_tree_node_version_immutability();

CREATE FUNCTION enforce_note_version_support_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT EXISTS (
    SELECT 1
    FROM tree_node_versions version
    WHERE version.id = NEW.target_note_version_id
      AND version.support_snapshot_complete = false
  ) THEN
    RAISE EXCEPTION 'cannot change a complete Note version support snapshot';
  END IF;
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Note version support snapshots are append-only';
END;
$$;

CREATE TRIGGER note_version_support_source_versions_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON note_version_support_source_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_note_version_support_immutability();

CREATE TRIGGER note_version_support_note_versions_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON note_version_support_note_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_note_version_support_immutability();
