import { defineConfig } from "drizzle-kit";

// Migrations are hand-written SQL in ./drizzle (the schema doc is the source
// of truth, including CHECK constraints, partial indexes, generated tsvector
// columns, and append-only triggers that drizzle-kit cannot generate).
// This config exists for `drizzle-kit studio` / introspection convenience.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree",
  },
});
