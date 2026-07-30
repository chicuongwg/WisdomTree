-- Scoped membership and revocable sessions. Existing memberships retain
-- contributor access; the creator of a space owns its administration.

ALTER TABLE space_members
  ADD COLUMN member_role text NOT NULL DEFAULT 'contributor'
  CHECK (member_role IN ('viewer', 'contributor', 'manager'));

UPDATE space_members sm
SET member_role = 'manager'
FROM spaces s
WHERE s.id = sm.space_id
  AND s.created_by = sm.user_id;

CREATE INDEX space_members_user_idx ON space_members(user_id);
CREATE INDEX vault_grants_user_idx ON vault_grants(user_id);

CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_active_idx
  ON sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;
