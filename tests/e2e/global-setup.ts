import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { configureIsolatedTestDatabase } from "../db-safety";

// Sign the E2E run in the way production signs anyone in: a sessions row for
// the seeded admin, its raw token written into a Playwright storageState as
// the session cookie. No in-app backdoor — the dev-login endpoint is gone.
export default async function globalSetup() {
  configureIsolatedTestDatabase();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id FROM users WHERE email = 'huong@wisdomtree.local' AND disabled_at IS NULL`,
    );
    if (!rows[0]) throw new Error("E2E needs the seeded admin (run db:seed first).");
    const token = randomBytes(32).toString("base64url");
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '1 day')`,
      [rows[0].id, createHash("sha256").update(token).digest("hex")],
    );
    const stateDir = path.join(process.cwd(), "tests", "e2e", ".auth");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      path.join(stateDir, "admin.json"),
      JSON.stringify({
        cookies: [
          {
            name: "session",
            value: token,
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 86_400,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      }),
    );
  } finally {
    await client.end();
  }
}
