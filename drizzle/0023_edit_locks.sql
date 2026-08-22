-- Single-writer editing: while someone holds a node's editor open, everyone
-- else sees a lock ("đang được chỉnh sửa bởi …") and cannot save. One row per
-- node (PK), keyed to the holder's login session so even the same person in a
-- second browser is a different holder. heartbeat_at is refreshed by the open
-- editor; a stale heartbeat means the tab is gone and the lock is free.
CREATE TABLE node_edit_locks (
  node_id uuid PRIMARY KEY REFERENCES tree_nodes(id),
  user_id uuid NOT NULL REFERENCES users(id),
  session_key text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now()
);
