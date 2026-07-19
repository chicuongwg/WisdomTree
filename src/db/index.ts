import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree",
});

export const db = drizzle(pool, { schema });
export { schema };

/** A live transaction handle — every mutation service runs inside one. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
