ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES users(id);

CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_state_idx ON tasks(assigned_to, state);
