CREATE TABLE vaults (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL CHECK (kind IN ('personal', 'shared')),
  owner_user_id uuid REFERENCES users(id),
  name          text NOT NULL,
  git_repo_key  text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'personal' AND owner_user_id IS NOT NULL)
    OR (kind = 'shared' AND owner_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX vaults_one_personal_per_user
  ON vaults(owner_user_id)
  WHERE kind = 'personal';

CREATE TABLE vault_grants (
  vault_id   uuid NOT NULL REFERENCES vaults(id),
  user_id    uuid NOT NULL REFERENCES users(id),
  grant_name text NOT NULL CHECK (grant_name IN ('owner', 'editor', 'reviewer', 'viewer')),
  granted_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vault_id, user_id)
);

CREATE TABLE user_capabilities (
  user_id    uuid NOT NULL REFERENCES users(id),
  capability text NOT NULL,
  granted_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, capability)
);

ALTER TABLE branches
  ADD COLUMN vault_id uuid REFERENCES vaults(id),
  ADD COLUMN parent_id uuid REFERENCES branches(id);

INSERT INTO vaults (kind, owner_user_id, name, git_repo_key)
SELECT
  'personal',
  u.id,
  u.display_name,
  'personal/' || u.id
FROM users u;

INSERT INTO vault_grants (vault_id, user_id, grant_name, granted_by)
SELECT v.id, v.owner_user_id, 'owner', v.owner_user_id
FROM vaults v
WHERE v.kind = 'personal';

INSERT INTO vaults (kind, name, git_repo_key)
SELECT 'shared', 'Tri thức chung', 'shared/main'
WHERE EXISTS (SELECT 1 FROM users);

UPDATE branches b
SET vault_id = v.id
FROM vaults v
WHERE b.scope = 'personal'
  AND v.kind = 'personal'
  AND v.owner_user_id = b.owner_user_id;

UPDATE branches b
SET vault_id = v.id
FROM vaults v
WHERE b.scope = 'team'
  AND v.kind = 'shared';

ALTER TABLE branches ALTER COLUMN vault_id SET NOT NULL;

CREATE INDEX branches_vault_parent_idx ON branches(vault_id, parent_id);

INSERT INTO user_capabilities (user_id, capability, granted_by)
SELECT u.id, c.capability, u.id
FROM users u
CROSS JOIN LATERAL (
  SELECT unnest(
    CASE u.role
      WHEN 'admin_op' THEN ARRAY[
        'users.manage',
        'audit.read',
        'catalog.manage',
        'circulation.manage',
        'shared.publish',
        'index.operate',
        'vault.break_glass'
      ]::text[]
      ELSE ARRAY[]::text[]
    END
  ) AS capability
) c;
