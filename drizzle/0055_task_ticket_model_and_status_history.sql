ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS sprint text,
  ADD COLUMN IF NOT EXISTS estimate_points integer,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_by uuid REFERENCES users(id);

CREATE TABLE IF NOT EXISTS task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(project_id) ON DELETE CASCADE,
  from_state text,
  to_state text NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_status_history_task_id_idx ON task_status_history(task_id);
CREATE INDEX IF NOT EXISTS task_status_history_project_id_idx ON task_status_history(project_id);
CREATE INDEX IF NOT EXISTS task_status_history_created_at_idx ON task_status_history(created_at);
CREATE INDEX IF NOT EXISTS task_status_history_changed_by_idx ON task_status_history(changed_by);
CREATE INDEX IF NOT EXISTS task_status_history_to_state_idx ON task_status_history(to_state);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_sprint_idx ON tasks(sprint);

-- Backfill initial creation record for existing tasks
INSERT INTO task_status_history (task_id, project_id, from_state, to_state, changed_by, assigned_to, notes, created_at)
SELECT
  id AS task_id,
  project_id,
  NULL AS from_state,
  CASE WHEN state = 'done' THEN 'todo' ELSE state END AS to_state,
  created_by AS changed_by,
  assigned_to,
  'Initial task creation' AS notes,
  created_at
FROM tasks
WHERE NOT EXISTS (
  SELECT 1 FROM task_status_history WHERE task_status_history.task_id = tasks.id
);

-- Backfill completion records for tasks that are currently done
INSERT INTO task_status_history (task_id, project_id, from_state, to_state, changed_by, assigned_to, notes, created_at)
SELECT
  id AS task_id,
  project_id,
  'doing' AS from_state,
  'done' AS to_state,
  COALESCE(completed_by, created_by) AS changed_by,
  assigned_to,
  'Task completed' AS notes,
  COALESCE(completed_at, updated_at) AS created_at
FROM tasks
WHERE state = 'done'
  AND id NOT IN (
    SELECT task_id FROM task_status_history WHERE to_state = 'done'
  );
