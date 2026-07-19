-- Migration 0000: demo schema subset.
-- Source of truth: docs/design/database-schema.md — tables, columns, states, and
-- indexes are transcribed from that document for the in-scope demo surfaces
-- (auth, storage, catalog, circulation, notify, audit + cross-cutting outbox).
-- Deviations from the doc are listed in README.md § "Deviations for owner review".

CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is STABLE, not IMMUTABLE, so it cannot appear in a generated column
-- directly; this standard wrapper pins the dictionary and satisfies the doc's
-- "GENERATED from unaccent(...)" tsvector design.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN public.unaccent('public.unaccent', $1);

-- ---------------------------------------------------------------------------
-- Module: auth
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub   text UNIQUE NOT NULL,
  email        text UNIQUE NOT NULL,
  display_name text NOT NULL,
  role         text NOT NULL CHECK (role IN ('user', 'editor', 'admin_op')),
  zalo_user_id text,
  locale       text NOT NULL DEFAULT 'vi',
  disabled_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  version      int NOT NULL DEFAULT 1
);

-- Sessions are framework-managed (cookie sessions); no session table.

-- ---------------------------------------------------------------------------
-- Module: storage
-- ---------------------------------------------------------------------------

CREATE TABLE spaces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL CHECK (type IN ('team', 'personal')),
  owner_user_id uuid REFERENCES users(id),
  created_by    uuid NOT NULL REFERENCES users(id),
  archived_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  version       int NOT NULL DEFAULT 1
);

-- One personal space per member.
CREATE UNIQUE INDEX spaces_one_personal_per_owner
  ON spaces (owner_user_id) WHERE type = 'personal';

CREATE TABLE space_members (
  space_id   uuid NOT NULL REFERENCES spaces(id),
  user_id    uuid NOT NULL REFERENCES users(id),
  added_by   uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

CREATE TABLE sources (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id           uuid NOT NULL REFERENCES spaces(id),
  title              text NOT NULL,
  description        text,
  trust_status       text NOT NULL DEFAULT 'unknown'
                     CHECK (trust_status IN ('unknown', 'candidate', 'trusted', 'rejected', 'archived')),
  submitted_by       uuid NOT NULL REFERENCES users(id),
  assigned_to        uuid REFERENCES users(id),
  current_version_id uuid, -- FK added after source_versions exists
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  version            int NOT NULL DEFAULT 1
);

CREATE INDEX sources_space_updated_idx ON sources (space_id, updated_at DESC);
CREATE INDEX sources_submitted_by_idx ON sources (submitted_by);

CREATE TABLE source_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid NOT NULL REFERENCES sources(id),
  seq                 int NOT NULL,
  original_object_key text NOT NULL,
  original_filename   text NOT NULL,
  mime_type           text NOT NULL,
  size_bytes          bigint NOT NULL CHECK (size_bytes <= 104857600),
  checksum_sha256     text NOT NULL,
  storage_state       text NOT NULL DEFAULT 'uploaded'
                      CHECK (storage_state IN ('uploaded', 'stored', 'quarantined', 'archived')),
  extraction_status   text NOT NULL DEFAULT 'pending'
                      CHECK (extraction_status IN ('pending', 'processed', 'unprocessable')),
  extraction_meta     jsonb,
  preview_object_keys jsonb,
  uploaded_by         uuid NOT NULL REFERENCES users(id),
  stored_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             int NOT NULL DEFAULT 1,
  UNIQUE (source_id, seq)
);

ALTER TABLE sources
  ADD CONSTRAINT sources_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES source_versions(id);

CREATE TABLE text_chunks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_version_id uuid NOT NULL REFERENCES source_versions(id),
  position          int NOT NULL,
  ref_type          text NOT NULL CHECK (ref_type IN ('page', 'paragraph')),
  ref_label         text NOT NULL,
  content           text NOT NULL,
  tsv               tsvector GENERATED ALWAYS AS (to_tsvector('simple', immutable_unaccent(content))) STORED,
  -- embedding vector: added by ALTER TABLE in Phase 1.5 (pgvector), per the schema doc
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_version_id, position)
);

CREATE INDEX text_chunks_tsv_idx ON text_chunks USING gin (tsv);

-- Append-only: raw extracted text is never updated or deleted.
CREATE OR REPLACE FUNCTION forbid_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER text_chunks_append_only
  BEFORE UPDATE OR DELETE ON text_chunks
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE branch_gap_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  state               text NOT NULL DEFAULT 'submitted'
                      CHECK (state IN ('submitted', 'triaged', 'converted_to_branch', 'rejected', 'archived')),
  submitted_by        uuid NOT NULL REFERENCES users(id),
  triaged_by          uuid REFERENCES users(id),
  converted_branch_id uuid, -- FK to branches deferred: knowledge module is out of demo scope
  converted_node_id   uuid, -- FK to tree_nodes deferred: knowledge module is out of demo scope
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             int NOT NULL DEFAULT 1
);

-- Backs Source Intake, My Submissions, and Source Inbox (verbatim from the schema doc).
CREATE VIEW intake_items AS
SELECT id AS submission_id, 'source' AS item_type, title,
       trust_status AS state, submitted_by, updated_at AS last_updated_at
FROM sources
UNION ALL
SELECT id, 'branch_gap_request', title, state, submitted_by, updated_at
FROM branch_gap_requests;

-- ---------------------------------------------------------------------------
-- Modules: catalog and circulation
-- ---------------------------------------------------------------------------

CREATE TABLE catalog_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code        text UNIQUE NOT NULL,
  title            text NOT NULL,
  author           text,
  cover_photo_key  text,
  location         text,
  status           text NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'borrowed', 'lost', 'repair')),
  space_id         uuid NOT NULL REFERENCES spaces(id),
  linked_source_id uuid REFERENCES sources(id),
  import_id        uuid, -- FK to bridge_imports deferred: bridge-google module is out of demo scope
  created_by       uuid NOT NULL REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  version          int NOT NULL DEFAULT 1
);

CREATE INDEX catalog_items_space_status_idx ON catalog_items (space_id, status);
-- Librarian search over (title, author): tsvector option from the schema doc.
CREATE INDEX catalog_items_search_idx ON catalog_items
  USING gin (to_tsvector('simple', immutable_unaccent(title || ' ' || coalesce(author, ''))));

CREATE TABLE loan_tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid NOT NULL REFERENCES catalog_items(id),
  borrower_id  uuid NOT NULL REFERENCES users(id),
  state        text NOT NULL DEFAULT 'requested'
               CHECK (state IN ('requested', 'approved', 'declined', 'borrowed', 'overdue', 'returned')),
  requested_at timestamptz NOT NULL,
  approved_at  timestamptz,
  borrowed_at  timestamptz,
  due_at       timestamptz,
  returned_at  timestamptz,
  handled_by   uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  version      int NOT NULL DEFAULT 1
);

-- One active loan per item.
CREATE UNIQUE INDEX loan_tickets_one_active_per_item
  ON loan_tickets (item_id)
  WHERE state IN ('requested', 'approved', 'borrowed', 'overdue');

-- ---------------------------------------------------------------------------
-- Module: notify (demo: in-app records only; email/zalo channels log to console)
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id),
  event_type text NOT NULL,
  payload    jsonb NOT NULL,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON notifications (user_id, read_at, created_at DESC);

-- ---------------------------------------------------------------------------
-- Module: audit
-- ---------------------------------------------------------------------------

CREATE TABLE audit_events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id       uuid NOT NULL REFERENCES users(id),
  actor_role     text NOT NULL,
  accountability text NOT NULL
                 CHECK (accountability IN ('uploader', 'editor_updater', 'approver_publisher', 'operator')),
  action         text NOT NULL,
  target_type    text NOT NULL,
  target_id      uuid NOT NULL,
  outcome        text NOT NULL CHECK (outcome IN ('success', 'denied', 'failed')),
  details        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id, created_at);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_id, created_at);

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ---------------------------------------------------------------------------
-- Cross-cutting: transactional outbox
-- ---------------------------------------------------------------------------

CREATE TABLE outbox_events (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);
