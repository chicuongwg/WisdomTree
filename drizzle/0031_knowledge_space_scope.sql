-- 0031 — shared knowledge belongs to a team space.
-- Personal branches keep their owner-only scope and deliberately carry no
-- space_id. Existing globally visible team branches move together into one
-- legacy space so this migration preserves their previous readership without
-- guessing which existing project space each subject belongs to.

ALTER TABLE branches
  ADD COLUMN space_id uuid REFERENCES spaces(id);

DO $$
DECLARE
  legacy_space_id uuid;
  legacy_creator uuid;
BEGIN
  SELECT created_by INTO legacy_creator
  FROM branches
  WHERE scope = 'team'
  ORDER BY created_at, id
  LIMIT 1;

  IF legacy_creator IS NOT NULL THEN
    INSERT INTO spaces (name, type, created_by)
    VALUES ('Kho tri thức chung', 'team', legacy_creator)
    RETURNING id INTO legacy_space_id;

    INSERT INTO space_members (space_id, user_id, member_role, added_by)
    SELECT legacy_space_id, id, 'viewer', legacy_creator
    FROM users
    WHERE disabled_at IS NULL
    ON CONFLICT DO NOTHING;

    UPDATE branches
    SET space_id = legacy_space_id
    WHERE scope = 'team';
  END IF;
END $$;

ALTER TABLE branches
  ADD CONSTRAINT branches_scope_space_check CHECK (
    (scope = 'team' AND space_id IS NOT NULL AND owner_user_id IS NULL)
    OR
    (scope = 'personal' AND space_id IS NULL AND owner_user_id IS NOT NULL)
  );

DROP INDEX branches_team_name_key;
CREATE UNIQUE INDEX branches_team_space_name_key
  ON branches (space_id, name) WHERE scope = 'team';

CREATE INDEX branches_space_idx ON branches (space_id) WHERE scope = 'team';
