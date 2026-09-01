-- 0037 — confirmed Projects extend team Spaces without reclassifying legacy data.
-- Deliberately no INSERT/UPDATE of existing rows: a team Space becomes a Project
-- only through an explicit projects row created by the Project service.

CREATE TABLE projects (
  project_id uuid PRIMARY KEY,
  research_lens text NOT NULL CONSTRAINT projects_research_lens_nonempty
    CHECK (btrim(research_lens) <> ''),
  description text,
  status text NOT NULL DEFAULT 'active' CONSTRAINT projects_status_check
    CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CONSTRAINT projects_version_positive CHECK (version > 0),
  CONSTRAINT projects_project_id_spaces_id_fk
    FOREIGN KEY (project_id) REFERENCES spaces(id) ON DELETE RESTRICT
);

CREATE INDEX projects_status_idx ON projects (status);

CREATE FUNCTION enforce_project_team_space() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  referenced_type text;
BEGIN
  -- Lock the referenced Space against concurrent type changes until this
  -- transaction commits; the reverse trigger below closes the other direction.
  SELECT type INTO referenced_type FROM spaces WHERE id = NEW.project_id FOR SHARE;
  IF referenced_type IS DISTINCT FROM 'team' THEN
    RAISE EXCEPTION 'a project must reference a team space'
      USING ERRCODE = '23514', CONSTRAINT = 'projects_team_space_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_team_space_check
BEFORE INSERT OR UPDATE OF project_id ON projects
FOR EACH ROW EXECUTE FUNCTION enforce_project_team_space();

CREATE FUNCTION prevent_project_space_type_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type <> 'team' AND EXISTS (
    SELECT 1 FROM projects WHERE project_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'a project space must remain a team space'
      USING ERRCODE = '23514', CONSTRAINT = 'project_space_type_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_space_type_check
BEFORE UPDATE OF type ON spaces
FOR EACH ROW EXECUTE FUNCTION prevent_project_space_type_change();
