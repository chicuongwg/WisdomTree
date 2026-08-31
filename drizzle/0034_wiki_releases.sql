CREATE TABLE wiki_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id),
  release_no integer NOT NULL,
  status text NOT NULL DEFAULT 'building'
    CHECK (status IN ('building', 'released', 'failed')),
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  manifest_sha256 text,
  commit_sha text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  UNIQUE (space_id, release_no)
);

CREATE INDEX wiki_releases_space_idx
  ON wiki_releases (space_id, release_no DESC);

CREATE FUNCTION prevent_released_wiki_release_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'released' THEN
    RAISE EXCEPTION 'released wiki releases are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wiki_releases_immutable
BEFORE UPDATE OR DELETE ON wiki_releases
FOR EACH ROW EXECUTE FUNCTION prevent_released_wiki_release_mutation();
