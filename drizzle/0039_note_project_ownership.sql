-- 0039 — authoritative Project ownership for target Notes and their private drafts.
-- Existing Nodes/Drafts remain NULL as demo/legacy compatibility data.

ALTER TABLE tree_nodes ADD COLUMN project_id uuid;
ALTER TABLE tree_nodes ADD CONSTRAINT tree_nodes_project_id_projects_project_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE RESTRICT;
CREATE INDEX tree_nodes_project_id_idx ON tree_nodes (project_id);

ALTER TABLE node_drafts ADD COLUMN project_id uuid;
ALTER TABLE node_drafts ADD CONSTRAINT node_drafts_project_id_projects_project_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE RESTRICT;
CREATE INDEX node_drafts_project_author_idx ON node_drafts (project_id, author_id);

CREATE FUNCTION enforce_project_note_branch() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  branch_scope text;
  branch_space_id uuid;
BEGIN
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT scope, space_id INTO branch_scope, branch_space_id
  FROM branches WHERE id = NEW.branch_id FOR SHARE;
  IF branch_scope IS DISTINCT FROM 'team' OR branch_space_id IS DISTINCT FROM NEW.project_id THEN
    RAISE EXCEPTION 'a Project Note must use a Team Branch in the same Project'
      USING ERRCODE = '23514', CONSTRAINT = 'project_note_branch_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tree_nodes_project_branch_check
BEFORE INSERT OR UPDATE OF project_id, branch_id ON tree_nodes
FOR EACH ROW EXECUTE FUNCTION enforce_project_note_branch();

CREATE TRIGGER node_drafts_project_branch_check
BEFORE INSERT OR UPDATE OF project_id, branch_id ON node_drafts
FOR EACH ROW EXECUTE FUNCTION enforce_project_note_branch();

CREATE FUNCTION enforce_project_note_draft() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.node_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tree_nodes
    WHERE id = NEW.node_id AND project_id IS DISTINCT FROM NEW.project_id
  ) THEN
    RAISE EXCEPTION 'a Note draft must retain its Note Project'
      USING ERRCODE = '23514', CONSTRAINT = 'project_note_draft_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER node_drafts_project_node_check
BEFORE INSERT OR UPDATE OF project_id, node_id ON node_drafts
FOR EACH ROW EXECUTE FUNCTION enforce_project_note_draft();

CREATE FUNCTION prevent_project_note_branch_mismatch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM tree_nodes
    WHERE branch_id = NEW.id AND project_id IS NOT NULL
      AND (NEW.scope IS DISTINCT FROM 'team' OR project_id IS DISTINCT FROM NEW.space_id)
  ) OR EXISTS (
    SELECT 1 FROM node_drafts
    WHERE branch_id = NEW.id AND project_id IS NOT NULL
      AND (NEW.scope IS DISTINCT FROM 'team' OR project_id IS DISTINCT FROM NEW.space_id)
  ) THEN
    RAISE EXCEPTION 'a Branch with Project Notes must remain in that Project'
      USING ERRCODE = '23514', CONSTRAINT = 'project_note_branch_reverse_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_note_branch_reverse_check
BEFORE UPDATE OF scope, space_id ON branches
FOR EACH ROW EXECUTE FUNCTION prevent_project_note_branch_mismatch();
