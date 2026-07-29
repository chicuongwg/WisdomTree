import assert from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const run = async () => {
  // Ensure DB is up and migrated + seeded. Requires Docker Compose and local Docker.
  console.log("Bringing up DB and running migrations + seed (may take a while)...");
  await execFileAsync("npm", ["run", "db:up"]);
  await execFileAsync("npm", ["run", "db:migrate"]);
  await execFileAsync("bash", ["-lc", "ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed"]);

  // Enable dev login gate for the test
  process.env.ENABLE_DEV_LOGIN = "1";
  (process.env as Record<string, string>).NODE_ENV = "development";

  const mod = await import("@/modules/auth/dev-auth");
  const { listSignInCandidates, findSignInCandidate } = mod;

  const users = await listSignInCandidates();
  assert.ok(Array.isArray(users) && users.length >= 1, "seeded users should exist");
  const u = users[0];
  const found = await findSignInCandidate(u.id);
  assert.ok(found && found.id === u.id, "findSignInCandidate must resolve the seeded user");
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
