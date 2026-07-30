import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Local development keeps the localhost default. `next build` imports this
// module while collecting page data, so the build phase is allowed to proceed
// without a runtime URL; the deployed server is not.
const configuredDatabaseUrl = process.env.DATABASE_URL;
if (
  !configuredDatabaseUrl &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  throw new Error("DATABASE_URL is required in production.");
}
const pool = new Pool({
  connectionString:
    configuredDatabaseUrl ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree",
});

// An idle client erroring (a database restart, a dropped connection) emits on
// the pool, and an unhandled 'error' event on an EventEmitter takes the whole
// process down. Log it and let the pool replace the client.
pool.on("error", (err) => console.error("[db] idle client error:", err));

export const db = drizzle(pool, { schema });
export { schema };

/**
 * Can this process reach its database? The health route's whole question, kept
 * here so the route needs no query builder of its own — delivery code does not
 * import drizzle (see scripts/boundaries.test.ts).
 */
export async function ping(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/** A live transaction handle — every mutation service runs inside one. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
