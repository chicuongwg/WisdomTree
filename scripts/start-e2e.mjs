import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";
if (!existsSync(`${standalone}/server.js`)) {
  throw new Error("Missing standalone build. Run `npm run build` before E2E tests.");
}

process.env.DATABASE_URL ??= "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree";
process.env.SESSION_SECRET ??= "wisdomtree-e2e-session-secret";
process.env.CRON_SECRET ??= "wisdomtree-e2e-cron-secret";

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });

await import(`../${standalone}/server.js`);
