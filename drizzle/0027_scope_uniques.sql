-- 0027 — the two global unique constraints learn their real scope. A branch
-- name only has to be unique inside its vault (two people's personal vaults
-- may both hold "Ghi chú"); a node slug only inside its branch (the export
-- path is branch-slug/node-slug, and wiki-links resolve by title, not slug).
-- Globally they made the second user's namespace hostage to the first's —
-- branch creation crashed outright on a duplicate name.
ALTER TABLE branches DROP CONSTRAINT branches_name_key;
ALTER TABLE branches ADD CONSTRAINT branches_vault_id_name_key UNIQUE (vault_id, name);
ALTER TABLE tree_nodes DROP CONSTRAINT tree_nodes_slug_key;
ALTER TABLE tree_nodes ADD CONSTRAINT tree_nodes_branch_id_slug_key UNIQUE (branch_id, slug);
