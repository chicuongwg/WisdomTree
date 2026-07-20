-- Batch I: a task grows a page of its own.
--
-- start_at gives the board a DURATION rather than a single instant: due_at
-- alone says when work must stop, which is not the same as how long there is
-- to do it. NULL start = the task is a point on the calendar, not a bar.
--
-- notes is the body of that page — the detail nobody can fit in a title, and
-- the reason this replaces a row in a spreadsheet.
ALTER TABLE tasks ADD COLUMN start_at timestamptz;
ALTER TABLE tasks ADD COLUMN notes text;

-- Ordering a week's bars by when they open.
CREATE INDEX tasks_start_at ON tasks(start_at) WHERE start_at IS NOT NULL;
