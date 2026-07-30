CREATE TABLE vault_git_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        uuid NOT NULL REFERENCES vaults(id),
  node_version_id uuid NOT NULL UNIQUE REFERENCES tree_node_versions(id),
  state           text NOT NULL DEFAULT 'pending'
                  CHECK (state IN ('pending', 'running', 'done', 'failed')),
  attempts        integer NOT NULL DEFAULT 0,
  commit_sha      text,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vault_git_jobs_pending_idx
  ON vault_git_jobs(created_at)
  WHERE state IN ('pending', 'failed');
