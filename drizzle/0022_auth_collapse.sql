-- Capabilities collapse into the role column and vault grants into vault
-- ownership (shared vault = every member, personal vault = its owner). The
-- google-bridge tables never grew a service; the vault git key died with the
-- mirror; zalo_user_id belonged to a notification channel that was a stub.
DROP TABLE IF EXISTS user_capabilities;
DROP TABLE IF EXISTS vault_grants;
DROP TABLE IF EXISTS bridge_import_items;
DROP TABLE IF EXISTS bridge_imports;
ALTER TABLE vaults DROP COLUMN IF EXISTS git_repo_key;
ALTER TABLE users DROP COLUMN IF EXISTS zalo_user_id;
