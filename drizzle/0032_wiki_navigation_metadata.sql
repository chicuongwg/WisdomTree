ALTER TABLE branches
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE tree_nodes
  ADD COLUMN summary text,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE node_proposals
  ADD COLUMN summary text,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX branches_navigation_idx
  ON branches (space_id, parent_id, sort_order, name)
  WHERE archived_at IS NULL;

CREATE INDEX tree_nodes_navigation_idx
  ON tree_nodes (branch_id, sort_order, title)
  WHERE verification <> 'archived';
