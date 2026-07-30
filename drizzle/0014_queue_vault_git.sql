CREATE FUNCTION queue_vault_git_job()
RETURNS trigger AS $$
DECLARE
  target_vault_id uuid;
BEGIN
  SELECT b.vault_id
  INTO target_vault_id
  FROM tree_nodes n
  JOIN branches b ON b.id = n.branch_id
  WHERE n.id = NEW.node_id;

  INSERT INTO vault_git_jobs (vault_id, node_version_id)
  VALUES (target_vault_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tree_node_versions_queue_vault_git
AFTER INSERT ON tree_node_versions
FOR EACH ROW EXECUTE FUNCTION queue_vault_git_job();
