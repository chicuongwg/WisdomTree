// First-install provisioning for a real, empty database. Unlike seed.ts this
// creates no fixtures and never deletes data: every human-facing name comes
// from the operator.
import { randomUUID } from "node:crypto";
import { Client } from "pg";

function argument(flag: string, envName: string): string {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : process.env[envName];
  if (!value?.trim()) throw new Error(`${flag} or ${envName} is required`);
  return value.trim();
}

function connectionString(): string {
  const configured = process.env.DATABASE_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }
  return "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree";
}

async function main() {
  const email = argument("--admin-email", "BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const displayName = argument("--admin-name", "BOOTSTRAP_ADMIN_NAME");
  const sharedVaultName = argument("--shared-vault-name", "BOOTSTRAP_SHARED_VAULT_NAME");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid admin email");

  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  try {
    await client.query("BEGIN");
    // Serialize two operators accidentally running bootstrap together.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('wisdomtree:bootstrap'))");
    const { rows: state } = await client.query(
      `SELECT
         (SELECT count(*)::int FROM users) AS users,
         (SELECT count(*)::int FROM vaults) AS vaults`,
    );
    if (state[0].users !== 0 || state[0].vaults !== 0) {
      throw new Error("refusing to bootstrap: database already contains users or vaults");
    }

    const adminId = randomUUID();
    const personalVaultId = randomUUID();
    const sharedVaultId = randomUUID();
    await client.query(
      `INSERT INTO users (id, google_sub, email, display_name, role)
       VALUES ($1,$2,$3,$4,'admin_op')`,
      [adminId, `invited:${randomUUID()}`, email, displayName],
    );
    await client.query(
      `INSERT INTO vaults (id, kind, owner_user_id, name)
       VALUES ($1,'personal',$2,$3),
              ($4,'shared',NULL,$5)`,
      [personalVaultId, adminId, displayName, sharedVaultId, sharedVaultName],
    );
    await client.query(
      `INSERT INTO audit_events
         (actor_id, actor_role, accountability, action, target_type, target_id, outcome, details)
       VALUES ($1,'admin_op','operator','system.bootstrap','user',$1,'success',$2::jsonb)`,
      [adminId, JSON.stringify({ email, sharedVaultId })],
    );
    await client.query("COMMIT");
    console.log(`bootstrapped admin invitation for ${email}`);
    console.log(`shared vault: ${sharedVaultId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
