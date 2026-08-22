# WisdomTree Documentation

Documentation for the system **as built** (post the 2026-08-22/23 refactor).
The planning-era document tree that used to live here described a much larger
speculative system and was retired with it; it remains in git history
(`docs/` before commit `6c72880`).

## Reading order

1. [product.md](./product.md) — what the product is, for whom, and its scope.
2. [architecture.md](./architecture.md) — modules, data model, auth,
   the two-tier editing model, and the conventions the code enforces.
3. [operations.md](./operations.md) — running, deploying, backing up.
4. [roadmap.md](./roadmap.md) — what is deliberately not built yet (RAG).
5. [vocabulary-vi.md](./vocabulary-vi.md) — the Vietnamese UI term map.

## Conventions (standing owner decisions)

- **Simple-first**: the minimal design that meets the stated need, kept
  upgradeable; no tables, workers, abstractions, or admin UI for needs that
  do not exist yet. When two designs are equivalent, the one with fewer
  concepts wins.
- **English internals**: BE processing, APIs, error messages, logs, comments,
  DB-persisted generated strings, and these documents are English. Vietnamese
  exists only in the FE, always through the translator layer (`src/lib/vi`) —
  never hardcoded in a component. `ApiError.code` values are a stable
  contract; the FE translates by code (`translateApiError`).
- **Code is the source of truth** for schema and API shape: `drizzle/*.sql`
  (forward-only, tracked in `schema_migrations`) and `src/modules/*/schema.ts`
  for tables; the route files under `src/app/api/` for endpoints. These
  documents explain intent and invariants, not column-by-column detail.
