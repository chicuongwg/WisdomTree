-- Migration 0001: V1 schema parity.
-- Source of truth: docs/design/database-schema.md — adds every table the demo
-- subset (0000) omitted: storage curation overlay (corrected_texts, curations,
-- markdown_drafts), knowledge, pm, notify channels, bridge-google, export, and
-- the cross-cutting jobs table; closes the recorded V1 obligations (deferred
-- FKs, audit `member` accountability per the decision-log gate-2 ruling).
-- Forward-only, applies over existing demo data.

-- ---------------------------------------------------------------------------
-- Module: knowledge
-- ---------------------------------------------------------------------------

CREATE TABLE branches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  description text,
  created_by  uuid NOT NULL REFERENCES users(id),
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     int NOT NULL DEFAULT 1
);

CREATE TABLE tree_nodes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         uuid NOT NULL REFERENCES branches(id),
  title             text NOT NULL,
  slug              text UNIQUE NOT NULL,
  content_md        text NOT NULL,
  verification      text NOT NULL
                    CHECK (verification IN ('no_source', 'unverified', 'verified', 'archived')),
  -- Quartz front-matter flag; may be true only when verification = 'verified'.
  publish           boolean NOT NULL DEFAULT false
                    CHECK (publish = false OR verification = 'verified'),
  -- Merge redirect target; non-null implies verification = 'archived'.
  canonical_node_id uuid REFERENCES tree_nodes(id)
                    CHECK (canonical_node_id IS NULL OR verification = 'archived'),
  created_by        uuid NOT NULL REFERENCES users(id),
  tsv               tsvector GENERATED ALWAYS AS
                    (to_tsvector('simple', immutable_unaccent(title || ' ' || content_md))) STORED,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           int NOT NULL DEFAULT 1
);

CREATE INDEX tree_nodes_tsv_idx ON tree_nodes USING gin (tsv);

CREATE TABLE tree_node_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id        uuid NOT NULL REFERENCES tree_nodes(id),
  seq            int NOT NULL,
  content_md     text NOT NULL,
  verification   text NOT NULL, -- verification at snapshot time
  created_by     uuid NOT NULL REFERENCES users(id),
  change_summary text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, seq)
);

CREATE TRIGGER tree_node_versions_append_only
  BEFORE UPDATE OR DELETE ON tree_node_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE node_links (
  from_node_id uuid NOT NULL REFERENCES tree_nodes(id),
  to_node_id   uuid NOT NULL REFERENCES tree_nodes(id),
  link_type    text NOT NULL CHECK (link_type IN ('related', 'supports', 'contrasts', 'part_of')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_node_id, to_node_id, link_type)
);

CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE node_tags (
  node_id    uuid NOT NULL REFERENCES tree_nodes(id),
  tag_id     uuid NOT NULL REFERENCES tags(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, tag_id)
);

-- Provenance backbone: durable evidence-to-publication linkage.
CREATE TABLE promotions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id uuid NOT NULL REFERENCES source_versions(id),
  node_version_id   uuid NOT NULL REFERENCES tree_node_versions(id),
  approved_by       uuid NOT NULL REFERENCES users(id),
  excerpt_chunk_ids uuid[],
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER promotions_append_only
  BEFORE UPDATE OR DELETE ON promotions
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE review_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type   text NOT NULL
              CHECK (task_type IN ('correction', 'gap_triage', 'publish', 'merge', 'archive', 'operational')),
  target_type text NOT NULL
              CHECK (target_type IN ('source_version', 'branch_gap_request', 'markdown_draft', 'tree_node', 'conflict')),
  target_id   uuid NOT NULL,
  state       text NOT NULL
              CHECK (state IN ('queued', 'assigned', 'in_review', 'changes_requested', 'approved', 'rejected')),
  assigned_to uuid REFERENCES users(id),
  created_by  uuid NOT NULL REFERENCES users(id),
  resolved_by uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     int NOT NULL DEFAULT 1
);

CREATE INDEX review_tasks_queue_idx ON review_tasks (state, task_type);

CREATE TABLE conflicts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type       text NOT NULL
                    CHECK (target_type IN ('tree_node', 'corrected_text', 'markdown_draft', 'branch')),
  target_id         uuid NOT NULL,
  state             text NOT NULL
                    CHECK (state IN ('detected', 'locked', 'resolving', 'resolved', 'archived_conflict')),
  base_version      int NOT NULL,
  attempted_payload jsonb NOT NULL,
  attempted_by      uuid NOT NULL REFERENCES users(id),
  resolved_by       uuid REFERENCES users(id),
  resolution        jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           int NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- Module: storage — curation overlay tables omitted from the demo subset
-- ---------------------------------------------------------------------------

CREATE TABLE corrected_texts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id uuid NOT NULL REFERENCES source_versions(id),
  seq               int NOT NULL,
  content           text NOT NULL,
  edited_by         uuid NOT NULL REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_version_id, seq)
);

CREATE TABLE curations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id uuid UNIQUE NOT NULL REFERENCES source_versions(id),
  state             text NOT NULL
                    CHECK (state IN ('under_correction', 'ready_for_review', 'promoted', 'rejected')),
  assigned_to       uuid REFERENCES users(id),
  nominated_by      uuid NOT NULL REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  version           int NOT NULL DEFAULT 1
);

CREATE TABLE markdown_drafts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id   uuid UNIQUE NOT NULL REFERENCES source_versions(id),
  content_md          text NOT NULL,
  suggested_branch_id uuid REFERENCES branches(id),
  created_by          uuid NOT NULL REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             int NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- Module: pm
-- ---------------------------------------------------------------------------

CREATE TABLE deadlines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id         uuid NOT NULL REFERENCES spaces(id),
  title            text NOT NULL,
  type             text NOT NULL CHECK (type IN ('conference', 'funding', 'report', 'milestone')),
  due_at           timestamptz NOT NULL,
  reminder_offsets interval[] NOT NULL DEFAULT '{"7 days","1 day"}'::interval[],
  created_by       uuid NOT NULL REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          int NOT NULL DEFAULT 1
);

CREATE TABLE deadline_links (
  deadline_id uuid NOT NULL REFERENCES deadlines(id),
  target_type text NOT NULL CHECK (target_type IN ('task', 'source', 'tree_node')),
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deadline_id, target_type, target_id)
);

-- Sent offsets recorded so deadline.approaching reminders are idempotent.
CREATE TABLE deadline_reminders (
  deadline_id uuid NOT NULL REFERENCES deadlines(id),
  "offset"    interval NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deadline_id, "offset")
);

CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  state       text NOT NULL CHECK (state IN ('todo', 'doing', 'done', 'archived')),
  assigned_to uuid REFERENCES users(id),
  target_type text,
  target_id   uuid,
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     int NOT NULL DEFAULT 1
);

CREATE TABLE achievements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  branch_id   uuid REFERENCES branches(id),
  logged_by   uuid NOT NULL REFERENCES users(id),
  achieved_at timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE calendar_tokens (
  token      text PRIMARY KEY, -- unguessable (≥ 128-bit random, URL-safe)
  user_id    uuid NOT NULL REFERENCES users(id),
  space_id   uuid REFERENCES spaces(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Module: notify — comments + real delivery channels
-- ---------------------------------------------------------------------------

CREATE TABLE comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_type       text NOT NULL
                    CHECK (anchor_type IN ('source', 'tree_node', 'loan_ticket', 'deadline')),
  anchor_id         uuid NOT NULL,
  parent_comment_id uuid REFERENCES comments(id),
  author_id         uuid NOT NULL REFERENCES users(id),
  body              text NOT NULL,
  mentions          uuid[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_anchor_idx ON comments (anchor_type, anchor_id, created_at);

CREATE TRIGGER comments_append_only
  BEFORE UPDATE OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE notification_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id),
  channel         text NOT NULL CHECK (channel IN ('in_app', 'email', 'zalo')),
  state           text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'failed')),
  attempts        int NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Absent row means the default matrix in docs/system/notifications.md.
CREATE TABLE notification_preferences (
  user_id    uuid NOT NULL REFERENCES users(id),
  event_type text NOT NULL,
  channels   text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_type)
);

-- ---------------------------------------------------------------------------
-- Module: bridge-google
-- ---------------------------------------------------------------------------

CREATE TABLE bridge_imports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('drive', 'sheet_catalog', 'sheet_metrics', 'forms')),
  config      jsonb NOT NULL,
  state       text NOT NULL CHECK (state IN ('configured', 'running', 'succeeded', 'failed')),
  watermark   text,
  last_run_at timestamptz,
  last_report jsonb,
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  version     int NOT NULL DEFAULT 1
);

-- Idempotency: re-running an import skips any external_id already present.
CREATE TABLE bridge_import_items (
  import_id   uuid NOT NULL REFERENCES bridge_imports(id),
  external_id text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid,
  status      text NOT NULL CHECK (status IN ('created', 'skipped', 'failed')),
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (import_id, external_id)
);

-- ---------------------------------------------------------------------------
-- Module: export
-- ---------------------------------------------------------------------------

CREATE TABLE export_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope        text NOT NULL CHECK (scope IN ('full_tree', 'node')),
  node_id      uuid REFERENCES tree_nodes(id),
  state        text NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed')),
  triggered_by uuid NOT NULL REFERENCES users(id),
  manifest     jsonb,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Cross-cutting: durable worker job state (Redis carries only the wake-up)
-- ---------------------------------------------------------------------------

CREATE TABLE jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        text NOT NULL, -- extraction, render, reindex, drive_import, sheet_import, forms_poll, embedding (1.5)
  payload         jsonb NOT NULL,
  idempotency_key text UNIQUE NOT NULL, -- e.g. extract:{source_version_id}
  state           text NOT NULL CHECK (state IN ('queued', 'running', 'succeeded', 'failed', 'dead')),
  attempts        int NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Close recorded V1 obligations
-- ---------------------------------------------------------------------------

-- Deferred FKs from 0000 (README deviations 1 and 2), now that the referenced
-- knowledge / bridge-google tables exist.
ALTER TABLE branch_gap_requests
  ADD CONSTRAINT branch_gap_requests_converted_branch_fk
  FOREIGN KEY (converted_branch_id) REFERENCES branches(id);
ALTER TABLE branch_gap_requests
  ADD CONSTRAINT branch_gap_requests_converted_node_fk
  FOREIGN KEY (converted_node_id) REFERENCES tree_nodes(id);
ALTER TABLE catalog_items
  ADD CONSTRAINT catalog_items_import_fk
  FOREIGN KEY (import_id) REFERENCES bridge_imports(id);

-- Gate-2 ruling (docs/session/decision-log.md, 2026-07-20): audit
-- accountability gains a `member` stage for baseline member actions
-- (loan requests, comments).
ALTER TABLE audit_events DROP CONSTRAINT audit_events_accountability_check;
ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_accountability_check
  CHECK (accountability IN ('uploader', 'editor_updater', 'approver_publisher', 'operator', 'member'));
