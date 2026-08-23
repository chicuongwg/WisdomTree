-- 0030 — indexes for the read paths that actually run per page view.
-- Postgres does not index FK columns by itself; these cover the joins and
-- filters the services issue (backlinks, tag filters, pending-review lists,
-- per-item loan registers, calendar/deadline scans, provenance lookups,
-- the audit screen, and the Library's category filter).
CREATE INDEX node_links_to_idx ON node_links (to_node_id);
CREATE INDEX node_tags_tag_idx ON node_tags (tag_id);
CREATE INDEX node_proposals_node_created_idx ON node_proposals (node_id, created_at DESC);
CREATE INDEX node_proposals_pending_idx ON node_proposals (kind, created_at)
  WHERE state = 'pending';
CREATE INDEX loan_tickets_item_state_idx ON loan_tickets (item_id, state);
CREATE INDEX deadlines_space_due_idx ON deadlines (space_id, due_at);
CREATE INDEX deadlines_due_idx ON deadlines (due_at);
CREATE INDEX promotions_node_version_idx ON promotions (node_version_id);
CREATE INDEX promotions_source_version_idx ON promotions (source_version_id);
CREATE INDEX audit_events_created_idx ON audit_events (created_at DESC);
CREATE INDEX sources_category_idx ON sources (category_id);
