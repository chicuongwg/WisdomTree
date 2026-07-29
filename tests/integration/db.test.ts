import assert from "node:assert";
import { Client } from "pg";

export const run = async () => {
  const conn = process.env.DATABASE_URL ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree";
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const res = await client.query('select count(*)::int as c from users where disabled_at is null');
    const count = res.rows[0]?.c ?? 0;
    assert.ok(count >= 1, `expected at least 1 active user, got ${count}`);
  } finally {
    await client.end();
  }
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
