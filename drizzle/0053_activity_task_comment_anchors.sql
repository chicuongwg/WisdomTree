-- 0053 — Personal Projects are owner-scoped Projects over Personal Spaces.
-- Existing Projects remain Shared (personal_owner_id IS NULL). Existing
-- projectless Notes are not rewritten into a Project without an explicit
-- content migration.

ALTER TABLE projects
  ADD COLUMN personal_owner_id uuid REFERENCES users(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX projects_personal_owner_id_unique
  ON projects (personal_owner_id)
  WHERE personal_owner_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_project_team_space() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  referenced_type text;
  referenced_owner uuid;
BEGIN
  SELECT type, owner_user_id INTO referenced_type, referenced_owner
  FROM spaces WHERE id = NEW.project_id FOR SHARE;
  IF referenced_type = 'team' AND NEW.personal_owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF referenced_type = 'personal'
     AND referenced_owner IS NOT NULL
     AND NEW.personal_owner_id = referenced_owner THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'a shared Project requires a team Space and a Personal Project requires its owner Space'
    USING ERRCODE = '23514', CONSTRAINT = 'projects_space_kind_check';
END;
$$;

CREATE OR REPLACE FUNCTION prevent_project_space_type_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  personal_owner uuid;
BEGIN
  SELECT personal_owner_id INTO personal_owner FROM projects WHERE project_id = NEW.id;
  IF personal_owner IS NULL AND EXISTS (SELECT 1 FROM projects WHERE project_id = NEW.id)
     AND NEW.type <> 'team' THEN
    RAISE EXCEPTION 'a shared project space must remain a team space'
      USING ERRCODE = '23514', CONSTRAINT = 'project_space_type_check';
  END IF;
  IF personal_owner IS NOT NULL AND NEW.type <> 'personal' THEN
    RAISE EXCEPTION 'a personal project space must remain a personal space'
      USING ERRCODE = '23514', CONSTRAINT = 'project_space_type_check';
  END IF;
  RETURN NEW;
END;
$$;

-- 0037's trigger watched only project_id. This migration makes
-- personal_owner_id part of the same invariant: a later direct update cannot
-- turn a team-space Project into a Personal Project (or the reverse).
DROP TRIGGER projects_team_space_check ON projects;
CREATE TRIGGER projects_team_space_check
BEFORE INSERT OR UPDATE OF project_id, personal_owner_id ON projects
FOR EACH ROW EXECUTE FUNCTION enforce_project_team_space();

-- Preserve each already-owned Personal Space as its owner's Personal Project.
INSERT INTO projects (
  project_id,
  research_lens,
  description,
  status,
  created_by,
  personal_owner_id
)
SELECT s.id, 'Personal research workspace', NULL, 'active', s.created_by, s.owner_user_id
FROM spaces s
WHERE s.type = 'personal'
  AND s.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.project_id = s.id)
ON CONFLICT (project_id) DO NOTHING;

UPDATE space_members sm
SET member_role = 'manager'
FROM spaces s
WHERE sm.space_id = s.id
  AND s.type = 'personal'
  AND sm.user_id = s.owner_user_id;

DO $$
DECLARE
  member_row record;
  personal_project_id uuid;
BEGIN
  FOR member_row IN
    SELECT u.id
    FROM users u
    WHERE u.disabled_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM projects p WHERE p.personal_owner_id = u.id
      )
  LOOP
    personal_project_id := gen_random_uuid();

    INSERT INTO spaces (id, name, type, owner_user_id, created_by)
    VALUES (personal_project_id, 'My Project', 'personal', member_row.id, member_row.id);

    INSERT INTO projects (
      project_id,
      research_lens,
      description,
      status,
      created_by,
      personal_owner_id
    )
    VALUES (
      personal_project_id,
      'Personal research workspace',
      NULL,
      'active',
      member_row.id,
      member_row.id
    );

    INSERT INTO space_members (space_id, user_id, added_by, member_role)
    VALUES (personal_project_id, member_row.id, member_row.id, 'manager');
  END LOOP;
END $$;

-- Activity and Task join the existing concrete comment-anchor model.

ALTER TABLE comments DROP CONSTRAINT comments_anchor_type_check;
ALTER TABLE comments
  ADD CONSTRAINT comments_anchor_type_check
  CHECK (anchor_type IN ('source', 'tree_node', 'deadline', 'activity', 'task'));

CREATE OR REPLACE FUNCTION enforce_comment_anchor_exists() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.anchor_type = 'source' AND EXISTS (SELECT 1 FROM sources WHERE id = NEW.anchor_id) THEN RETURN NEW; END IF;
  IF NEW.anchor_type = 'tree_node' AND EXISTS (SELECT 1 FROM tree_nodes WHERE id = NEW.anchor_id) THEN RETURN NEW; END IF;
  IF NEW.anchor_type = 'deadline' AND EXISTS (SELECT 1 FROM deadlines WHERE id = NEW.anchor_id) THEN RETURN NEW; END IF;
  IF NEW.anchor_type = 'activity' AND EXISTS (SELECT 1 FROM activities WHERE id = NEW.anchor_id) THEN RETURN NEW; END IF;
  IF NEW.anchor_type = 'task' AND EXISTS (SELECT 1 FROM tasks WHERE id = NEW.anchor_id) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'comment anchor does not exist' USING ERRCODE = '23503';
END;
$$;

CREATE TRIGGER comments_anchor_exists
  BEFORE INSERT OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION enforce_comment_anchor_exists();
