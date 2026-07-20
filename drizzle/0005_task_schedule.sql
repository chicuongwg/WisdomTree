-- Batch H: the board grows a time axis. A task with no date can only live on a
-- kanban lane; the calendar views (month, week-by-hour) place tasks by due_at.
-- NULL = unscheduled, shown on the kanban only.
ALTER TABLE tasks ADD COLUMN due_at timestamptz;
CREATE INDEX tasks_due_at ON tasks(due_at) WHERE due_at IS NOT NULL;
