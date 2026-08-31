DO $$
DECLARE
  conflicts text;
BEGIN
  WITH active_titles AS (
    SELECT branch.space_id,
           node.id AS node_id,
           node.title,
           translate(lower(immutable_unaccent(regexp_replace(btrim(node.title), '\s+', ' ', 'g'))), 'đ', 'd') AS normalized
    FROM tree_nodes node
    JOIN branches branch ON branch.id = node.branch_id
    WHERE branch.scope = 'team'
      AND node.verification <> 'archived'
    UNION ALL
    SELECT branch.space_id,
           node.id AS node_id,
           translation.title,
           translate(lower(immutable_unaccent(regexp_replace(btrim(translation.title), '\s+', ' ', 'g'))), 'đ', 'd') AS normalized
    FROM node_translations translation
    JOIN tree_nodes node ON node.id = translation.node_id
    JOIN branches branch ON branch.id = node.branch_id
    WHERE branch.scope = 'team'
      AND node.verification <> 'archived'
  ), duplicate_titles AS (
    SELECT space_id, normalized, string_agg(DISTINCT title, ' | ' ORDER BY title) AS titles
    FROM active_titles
    GROUP BY space_id, normalized
    HAVING count(DISTINCT node_id) > 1
  )
  SELECT string_agg(format('space=%s titles=%s', space_id, titles), '; ' ORDER BY space_id, normalized)
  INTO conflicts
  FROM duplicate_titles;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate active wiki titles must be resolved before migration: %', conflicts;
  END IF;
END
$$;
