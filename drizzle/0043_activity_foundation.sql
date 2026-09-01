-- 0043 — Project-owned Activity workspaces and explicit contextual relations.
-- Existing demo records receive no Activity or inferred relationship.

CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  title text NOT NULL CONSTRAINT activities_title_nonempty CHECK (btrim(title) <> ''),
  activity_type text CONSTRAINT activities_type_short
    CHECK (activity_type IS NULL OR (btrim(activity_type) <> '' AND char_length(activity_type) <= 80)),
  summary text,
  status text NOT NULL DEFAULT 'planned' CONSTRAINT activities_status_check
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CONSTRAINT activities_version_positive CHECK (version > 0),
  CONSTRAINT activities_id_project_id_key UNIQUE (id, project_id)
);
CREATE INDEX activities_project_status_idx ON activities(project_id, status);

-- Composite target keys make Project equality a database invariant rather
-- than a convention held only by the service layer.
ALTER TABLE sources ADD CONSTRAINT sources_id_space_id_key UNIQUE (id, space_id);
ALTER TABLE tree_nodes ADD CONSTRAINT tree_nodes_id_project_id_key UNIQUE (id, project_id);

CREATE TABLE activity_people (
  activity_id uuid NOT NULL,
  project_id uuid NOT NULL,
  person_id uuid NOT NULL,
  role_label text CONSTRAINT activity_people_role_label_short
    CHECK (role_label IS NULL OR (btrim(role_label) <> '' AND char_length(role_label) <= 80)),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, person_id),
  CONSTRAINT activity_people_activity_project_fk
    FOREIGN KEY (activity_id, project_id) REFERENCES activities(id, project_id) ON DELETE CASCADE,
  CONSTRAINT activity_people_project_person_fk
    FOREIGN KEY (project_id, person_id) REFERENCES project_people(project_id, person_id) ON DELETE RESTRICT
);
CREATE INDEX activity_people_person_id_idx ON activity_people(person_id);

CREATE TABLE activity_materials (
  activity_id uuid NOT NULL,
  project_id uuid NOT NULL,
  source_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, source_id),
  CONSTRAINT activity_materials_activity_project_fk
    FOREIGN KEY (activity_id, project_id) REFERENCES activities(id, project_id) ON DELETE CASCADE,
  CONSTRAINT activity_materials_source_project_fk
    FOREIGN KEY (source_id, project_id) REFERENCES sources(id, space_id) ON DELETE RESTRICT
);
CREATE INDEX activity_materials_source_id_idx ON activity_materials(source_id);

CREATE TABLE activity_notes (
  activity_id uuid NOT NULL,
  project_id uuid NOT NULL,
  node_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, node_id),
  CONSTRAINT activity_notes_activity_project_fk
    FOREIGN KEY (activity_id, project_id) REFERENCES activities(id, project_id) ON DELETE CASCADE,
  CONSTRAINT activity_notes_node_project_fk
    FOREIGN KEY (node_id, project_id) REFERENCES tree_nodes(id, project_id) ON DELETE RESTRICT
);
CREATE INDEX activity_notes_node_id_idx ON activity_notes(node_id);

ALTER TABLE tasks ADD COLUMN activity_id uuid;
ALTER TABLE tasks ADD CONSTRAINT tasks_activity_project_fk
  FOREIGN KEY (activity_id, project_id) REFERENCES activities(id, project_id) ON DELETE RESTRICT;
CREATE INDEX tasks_activity_id_idx ON tasks(activity_id);
