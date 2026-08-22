-- Remove the vault git mirror (git-mirror.ts + static-vault.ts). Concurrent-edit
-- safety and version diff/revert are served DB-natively by tree_node_versions +
-- optimistic locking; manual tree export to the content repo remains in the
-- export module. Order matters: the 0014 trigger inserts into vault_git_jobs on
-- every tree_node_versions insert, so trigger and function must go before the
-- table or note saves would start failing mid-migration.
DROP TRIGGER tree_node_versions_queue_vault_git ON tree_node_versions;
DROP FUNCTION queue_vault_git_job();
DROP TABLE vault_git_jobs;
