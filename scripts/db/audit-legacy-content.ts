import { Client } from "pg";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree";
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT n.id AS node_id, n.title, v.id AS revision_id, v.seq,
              v.created_by, v.created_at, n.verification,
              EXISTS (
                SELECT 1 FROM promotions p WHERE p.node_version_id = v.id
              ) AS has_provenance
       FROM tree_node_versions v
       JOIN tree_nodes n ON n.id = v.node_id
       WHERE v.review_status = 'legacy_accepted'
       ORDER BY v.created_at, n.id, v.seq`,
    );
    console.log(JSON.stringify({ legacyAccepted: rows.length, revisions: rows }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
