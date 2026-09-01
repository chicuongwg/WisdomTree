// Aggregated Drizzle schema. Canonical data stays owned by its module
// — this file only re-exports for the db client.

export * from "../modules/auth/schema";
export * from "../modules/storage/schema";
export * from "../modules/knowledge/schema";
export * from "../modules/circulation/schema";
export * from "../modules/pm/schema";
export * from "../modules/notify/schema";
export * from "../modules/audit/schema";
export * from "../modules/export/schema";
export * from "../modules/project/schema";
export * from "../modules/person/schema";
export * from "../modules/activity/schema";
export * from "../modules/publication/schema";
