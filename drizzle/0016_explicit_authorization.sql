-- Explicit operational capabilities and shared-vault grants replace the
-- implicit admin scope bypass. Permission identifiers remain code-owned;
-- assignments are data.

INSERT INTO user_capabilities (user_id, capability, granted_by)
SELECT id, capability, id
FROM users
CROSS JOIN unnest(ARRAY[
  'capabilities.manage',
  'spaces.manage',
  'system.operate'
]) AS capability
WHERE role = 'admin_op'
ON CONFLICT DO NOTHING;

INSERT INTO vault_grants (vault_id, user_id, grant_name, granted_by)
SELECT v.id, u.id,
       CASE u.role
         WHEN 'admin_op' THEN 'owner'
         WHEN 'editor' THEN 'editor'
         ELSE 'viewer'
       END,
       u.id
FROM vaults v
CROSS JOIN users u
WHERE v.kind = 'shared'
ON CONFLICT DO NOTHING;
