# WisdomTree

Storage-first knowledge platform for a small team — a modular monolith built as
**Next.js (App Router) + Drizzle ORM + PostgreSQL**, one deployable, per the
stack pin in [docs/roadmap/demo-brief.md](docs/roadmap/demo-brief.md).

Planning and design docs live under [docs/](docs/README.md); they are the
canonical baseline. This tree is **step 1 (scaffold)** of the demo brief's
two-step delivery, awaiting the owner checkpoint before step 2 (build).

## Quickstart

```sh
npm install
npm run demo   # docker compose up db → migrate → seed → next dev
```

Or step by step:

```sh
docker compose up -d db   # PostgreSQL 16 on :5432
npm run db:migrate        # applies drizzle/*.sql (forward-only, tracked)
npm run db:seed           # acceptance-criteria dataset (re-runnable)
npm run dev               # http://localhost:3000
```

Seeded per the brief's acceptance criteria: 3 users (User/Editor/Admin-Op),
2 team spaces (one is the community library) + a personal space per user,
10 stored sources with mixed extraction states, 20 catalog items, 1 active loan.

## Layout

| Path | What it is |
| --- | --- |
| `docs/` | Canonical planning + design baseline (read `docs/roadmap/demo-brief.md` first) |
| `drizzle/0000_init.sql` | First migration, transcribed from `docs/design/database-schema.md` (demo subset) |
| `src/modules/<module>/` | Module boundaries per `docs/platform/module-map.md`: `auth`, `storage`, `catalog`, `circulation`, `notify`, `audit` |
| `src/modules/*/schema.ts` | Drizzle table definitions owned by that module |
| `src/modules/storage/object-store.ts` | Dev substitution interface: local FS now, S3 in V1 |
| `src/modules/storage/extraction.ts` | Dev substitution interface: in-process stub worker |
| `src/modules/auth/dev-auth.ts` | Dev substitution interface: user-picker sessions, OIDC in V1 |
| `src/db/` | Drizzle client, aggregated schema, cross-cutting outbox table |
| `src/lib/api-types.ts` | Generated from `docs/design/openapi.yaml` — regenerate with `npm run gen:api`, never edit |
| `scripts/db/` | Migration runner and seed script |

## Demo schema subset

The first migration implements exactly the tables the in-scope surfaces need,
by name, from the schema doc: `users`, `spaces`, `space_members`, `sources`,
`source_versions`, `text_chunks`, `branch_gap_requests`, the `intake_items`
view, `catalog_items`, `loan_tickets`, `notifications`, `audit_events`,
`outbox_events`. Out-of-scope modules (knowledge, pm, bridge-google, export,
search projections) and their tables arrive with V1, not the demo.

### Deviations for owner review

Flagged per the brief's "any mismatch is a defect" rule — each is a deliberate
subset consequence, none changes a name, type, or state:

1. `branch_gap_requests.converted_branch_id` / `converted_node_id` are plain
   uuid columns without their FK constraints — the referenced `branches` /
   `tree_nodes` tables are knowledge-module (out of demo scope). Constraints
   are added when those tables land.
2. `catalog_items.import_id` likewise lacks its FK to `bridge_imports`
   (bridge-google is out of demo scope).
3. `text_chunks` / `audit_events` immutability is enforced by trigger only;
   the second layer (revoking UPDATE/DELETE grants from a dedicated app role)
   needs a separate DB role, deferred to V1 deployment.
4. The tsvector columns use an `immutable_unaccent()` wrapper because raw
   `unaccent()` is not IMMUTABLE and cannot appear in a generated column —
   standard PostgreSQL practice, same semantics as the doc.
5. `notification_deliveries` / `notification_preferences` are omitted: the
   demo's notify substitution is "in-app records only", so only
   `notifications` is needed.
6. The cross-cutting `jobs` table is omitted (added at coordinator review):
   the demo's extraction substitution is an in-process stub with no durable
   job state; the table lands in V1 with the real worker.

All six deviations reviewed and approved by the coordinator on 2026-07-20
(gate 1 passed); the FK and grant-revoke items are V1 obligations.

## Development

- `npm run typecheck` — TypeScript over app + scripts.
- `npm run gen:api` — regenerate API types after any `openapi.yaml` change.
- Every mutable table carries `version` for optimistic locking; every mutation
  path must write `audit_events` and `outbox_events` in the same transaction
  (see `docs/design/database-schema.md` conventions) — enforced in step 2
  service code.
