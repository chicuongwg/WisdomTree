-- 0044 — Explicit singleton-TMKT Core membership.
-- No current role, Project membership, Person link or demo User is backfilled.

CREATE TABLE tmkt_core_members (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  granted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
