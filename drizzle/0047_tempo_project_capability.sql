-- 0047 — Project-scoped library capability and circulation operators.
-- No Project, including the demo representation of Tempo, is configured by inference.

CREATE TABLE project_capabilities (
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  capability text NOT NULL CONSTRAINT project_capabilities_capability_check
    CHECK (capability IN ('library_circulation')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, capability)
);

CREATE TABLE project_library_operators (
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT project_library_operators_membership_fk
    FOREIGN KEY (project_id, user_id)
    REFERENCES space_members(space_id, user_id)
    ON DELETE CASCADE
);
CREATE INDEX project_library_operators_user_id_idx ON project_library_operators(user_id);
