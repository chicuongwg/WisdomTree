-- 0028 — the vaults table retires. Branches already carried the whole story
-- (scope: team|personal, owner_user_id); the vault layer was a second
-- container homomorphic to spaces that only ever said the same thing again.
-- Visibility is now read straight off the branch row.

-- Backfill safety: make every branch self-describing before the column goes.
UPDATE branches b
SET scope = 'personal', owner_user_id = v.owner_user_id
FROM vaults v
WHERE b.vault_id = v.id AND v.kind = 'personal'
  AND (b.scope <> 'personal' OR b.owner_user_id IS NULL);
UPDATE branches b
SET scope = 'team'
FROM vaults v
WHERE b.vault_id = v.id AND v.kind = 'shared' AND b.scope <> 'team';

ALTER TABLE branches DROP CONSTRAINT branches_vault_id_name_key;
ALTER TABLE branches DROP COLUMN vault_id;
ALTER TABLE branches ADD CONSTRAINT branches_personal_owner_check
  CHECK (scope <> 'personal' OR owner_user_id IS NOT NULL);
CREATE UNIQUE INDEX branches_team_name_key ON branches (name) WHERE scope = 'team';
CREATE UNIQUE INDEX branches_personal_owner_name_key
  ON branches (owner_user_id, name) WHERE scope = 'personal';

ALTER TABLE extraction_candidates DROP COLUMN vault_id;
DROP TABLE vaults;
