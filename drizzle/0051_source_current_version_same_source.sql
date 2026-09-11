-- A Material's current SourceVersion must belong to that same Material.
-- The original single-column FK validates existence but not ownership.
ALTER TABLE source_versions
  ADD CONSTRAINT source_versions_id_source_id_key UNIQUE (id, source_id);

ALTER TABLE sources
  ADD CONSTRAINT sources_current_version_same_source_fk
  FOREIGN KEY (current_version_id, id)
  REFERENCES source_versions (id, source_id)
  ON DELETE RESTRICT;
