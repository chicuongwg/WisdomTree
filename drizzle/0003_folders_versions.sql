-- Batch C: folders inside a space, and the columns the Drive-shaped library
-- needs. A Kho was a flat, fixed-order list; sources had no parent column, so
-- no amount of UI could group anything.

CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES spaces(id),
  parent_id uuid REFERENCES folders(id),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Two "Báo cáo 2025" folders side by side in one place is a filing error,
  -- not a feature. NULLs compare distinct, so the root needs its own guard.
  CONSTRAINT folder_name_in_parent UNIQUE (space_id, parent_id, name)
);
CREATE UNIQUE INDEX folder_name_at_root ON folders(space_id, name) WHERE parent_id IS NULL;
CREATE INDEX folders_space_parent ON folders(space_id, parent_id);

-- NULL folder_id = the space root.
ALTER TABLE sources ADD COLUMN folder_id uuid REFERENCES folders(id);
CREATE INDEX sources_folder ON sources(folder_id);
