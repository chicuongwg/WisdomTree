-- 0042 — canonical TMKT-wide Person identity and Project context.
-- Authentication links remain optional and no existing demo data is inferred.

CREATE TABLE persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CONSTRAINT persons_display_name_nonempty
    CHECK (btrim(display_name) <> ''),
  summary text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CONSTRAINT persons_version_positive CHECK (version > 0)
);
CREATE INDEX persons_display_name_idx ON persons(display_name);

CREATE TABLE person_user_links (
  person_id uuid PRIMARY KEY REFERENCES persons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  linked_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_people (
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, person_id)
);
CREATE INDEX project_people_person_id_idx ON project_people(person_id);
