-- Books merge into the Library: catalog_items becomes source_physical, a 1:1
-- satellite of sources; the title/space move onto a sources row (category
-- "Sách"). loan_tickets.item_id keeps pointing at the same ids — the FK and
-- the one-active-loan partial unique index survive the rename untouched.

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sources ADD COLUMN category_id uuid REFERENCES categories(id);
INSERT INTO categories (name) VALUES ('Sách');

-- Every book gets a source row: reuse the linked one when it exists, mint one
-- otherwise (archived books included — their history must keep resolving).
ALTER TABLE catalog_items ADD COLUMN source_id uuid;
UPDATE catalog_items SET source_id = COALESCE(linked_source_id, gen_random_uuid());
INSERT INTO sources (id, space_id, title, trust_status, submitted_by, created_at, updated_at)
  SELECT source_id, space_id, title, 'unknown', created_by, created_at, updated_at
  FROM catalog_items WHERE linked_source_id IS NULL;
UPDATE sources SET category_id = (SELECT id FROM categories WHERE name = 'Sách')
  WHERE id IN (SELECT source_id FROM catalog_items);

ALTER TABLE catalog_items
  ALTER COLUMN source_id SET NOT NULL,
  ADD CONSTRAINT source_physical_source_id_key UNIQUE (source_id),
  ADD CONSTRAINT source_physical_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(id);
ALTER TABLE catalog_items
  DROP COLUMN title,
  DROP COLUMN space_id,
  DROP COLUMN linked_source_id,
  DROP COLUMN import_id;
ALTER TABLE catalog_items RENAME TO source_physical;
