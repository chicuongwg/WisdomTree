-- 0046 — authorization-aware PostgreSQL text-search indexes.
-- Canonical rows remain unchanged; no search document table or semantic backfill.

CREATE INDEX spaces_project_name_search_idx ON spaces USING gin (
  (setweight(to_tsvector('simple', immutable_unaccent(name)), 'A'))
);

CREATE INDEX projects_research_search_idx ON projects USING gin (
  (
    setweight(to_tsvector('simple', immutable_unaccent(research_lens)), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(description, ''))), 'C')
  )
);

CREATE INDEX tree_nodes_project_search_idx ON tree_nodes USING gin (
  (
    setweight(to_tsvector('simple', immutable_unaccent(title)), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(summary, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(content_md)), 'C')
  )
) WHERE project_id IS NOT NULL;

CREATE INDEX sources_project_search_idx ON sources USING gin (
  (
    setweight(to_tsvector('simple', immutable_unaccent(title)), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(description, ''))), 'B')
  )
);

CREATE INDEX persons_research_search_idx ON persons USING gin (
  (
    setweight(to_tsvector('simple', immutable_unaccent(display_name)), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(summary, ''))), 'B')
  )
);

CREATE INDEX note_public_revisions_search_idx ON note_public_revisions USING gin (
  (
    setweight(to_tsvector('simple', immutable_unaccent(title)), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(summary, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(content_md)), 'C')
  )
);
