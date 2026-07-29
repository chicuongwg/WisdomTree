-- Batch F: knowledge scope — split branches into team (shared) vs personal
-- (owned by one member). Personal branches are the user's private note tree;
-- team branches are the project's shared knowledge tree.
--
-- scope='team'     → visible to all space members (existing behaviour)
-- scope='personal' → visible only to owner_user_id (new)
--
-- Constraint: a personal branch must name its owner; a team branch must not.
-- The DEFAULT 'team' means all existing rows stay valid with no data migration.

ALTER TABLE branches
  ADD COLUMN scope text NOT NULL DEFAULT 'team'
    CHECK (scope IN ('team', 'personal')),
  ADD COLUMN owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE branches ADD CONSTRAINT branches_personal_needs_owner
  CHECK (scope != 'personal' OR owner_user_id IS NOT NULL);

ALTER TABLE branches ADD CONSTRAINT branches_team_no_owner
  CHECK (scope != 'team' OR owner_user_id IS NULL);
