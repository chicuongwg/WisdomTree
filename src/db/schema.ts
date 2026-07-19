// Aggregated Drizzle schema. Canonical data stays owned by its module
// (docs/platform/module-map.md); this file only re-exports for the db client.

export * from "../modules/auth/schema";
export * from "../modules/storage/schema";
export * from "../modules/catalog/schema";
export * from "../modules/circulation/schema";
export * from "../modules/notify/schema";
export * from "../modules/audit/schema";
export * from "./outbox";
