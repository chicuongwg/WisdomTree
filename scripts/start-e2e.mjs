import { cpSync, existsSync } from "node:fs";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("Refusing E2E server startup: TEST_DATABASE_URL is required.");
}
const parsedTestDatabaseUrl = new URL(testDatabaseUrl);
const testDatabaseName = decodeURIComponent(parsedTestDatabaseUrl.pathname.slice(1));
if (!/(^|_)test(_|$)/i.test(testDatabaseName)) {
  throw new Error(
    `Refusing E2E server startup: database "${testDatabaseName || "(missing)"}" is not explicitly named as a test database.`,
  );
}
process.env.DATABASE_URL = testDatabaseUrl;
process.env.SESSION_SECRET ??= "wisdomtree-e2e-session-secret";
process.env.CRON_SECRET ??= "wisdomtree-e2e-cron-secret";

const standalone = ".next/standalone";
if (!existsSync(`${standalone}/server.js`)) {
  throw new Error("Missing standalone build. Run `npm run build` before E2E tests.");
}

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });

await import(`../${standalone}/server.js`);
