-- 0038 — authoritative Project ownership for new target-product Tasks.
-- Existing Board Tasks remain NULL as legacy_unassigned compatibility data.

ALTER TABLE tasks ADD COLUMN project_id uuid;

ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_projects_project_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE RESTRICT;

CREATE INDEX tasks_project_id_idx ON tasks (project_id);
