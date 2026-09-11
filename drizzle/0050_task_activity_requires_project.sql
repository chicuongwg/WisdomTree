-- A legacy Task may have no Project, but it may never carry Activity context.
-- The composite FK alone uses MATCH SIMPLE and therefore accepts activity_id
-- with a NULL project_id.
ALTER TABLE tasks
  ADD CONSTRAINT tasks_activity_requires_project_check
  CHECK (activity_id IS NULL OR project_id IS NOT NULL);
