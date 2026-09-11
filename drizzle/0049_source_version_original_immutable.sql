-- A SourceVersion preserves the uploaded representation. Extraction may update
-- only derived processing state; replacing original bytes or identity requires
-- a new appended version.
CREATE OR REPLACE FUNCTION source_versions_preserve_original() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.seq IS DISTINCT FROM OLD.seq
     OR NEW.original_object_key IS DISTINCT FROM OLD.original_object_key
     OR NEW.original_filename IS DISTINCT FROM OLD.original_filename
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
     OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
     OR NEW.stored_at IS DISTINCT FROM OLD.stored_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'source version original representation is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER source_versions_preserve_original
BEFORE UPDATE ON source_versions
FOR EACH ROW EXECUTE FUNCTION source_versions_preserve_original();
