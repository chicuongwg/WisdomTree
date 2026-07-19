# WisdomTree

Storage-first knowledge platform for a small team — a modular monolith built as
**Next.js (App Router) + Drizzle ORM + PostgreSQL**, one deployable, per the
stack pin in [docs/roadmap/demo-brief.md](docs/roadmap/demo-brief.md).

Planning and design docs live under [docs/](docs/README.md); they are the
canonical baseline. This tree contains **step 2 (build)** of the demo brief's
two-step delivery: the in-scope flows (Happy Path 0 + catalog/circulation)
and the eight demo screens, awaiting the coordinator's acceptance check.

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

Sign-in is the dev-mode user picker (demo substitution): open the app and
choose a seeded member; V1 swaps in Google OIDC behind the same session shape.

### Acceptance proofs

With the app running (`npm run dev` or `npm run demo`):

```sh
npm run proofs
```

Runs the three proofs from the demo brief against the live app — store-first
(uploaded file visible and downloadable while extraction is `pending`;
`unprocessable` never removes it), space scoping (non-member reads 404,
writes 403, at the API not just the UI), and the loan lifecycle
(request → approve → borrow → return, second request on an active loan 409
in the contract Error shape) — plus the gate-1 check that every mutation
wrote `audit_events` and `outbox_events` in the same transaction, and that
the stub dispatcher produced in-app notifications.

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

## Step-2 notes for review

- **Screens** (screen-inventory.md routes, Vietnamese-first): `/` Home,
  `/library`, `/library/:id`, `/source/intake`, `/source/mine`, `/catalog`,
  `/catalog/:id`, `/catalog/admin`, plus the dev-only `/login` picker.
- **Dev-only routes** (substitutions, not in openapi.yaml): `POST
  /api/auth/dev-login` (user picker) and `GET /api/blob/{token}` — the latter
  stands in for the object-storage host: downloads still 302 through the
  authorized endpoint to a short-lived signed URL, never a public path.
- **New Vietnamese UI terms** not yet in `docs/ui/vocabulary-vi.md`, pending
  humanities review (marked NEW in `src/lib/vi.ts`): extraction
  `pending`/`processed` ("Đang chờ xử lý"/"Đã xử lý"), trust `unknown`
  ("Chưa đánh giá"), loan states ("Chờ duyệt", "Đã duyệt", "Từ chối",
  "Đang mượn", "Quá hạn", "Đã trả"), item statuses ("Sẵn sàng",
  "Đang được mượn", "Thất lạc", "Đang sửa chữa"), role names, and gap-request
  states. Per the vocabulary governance these need approval before V1 ships.
- **Accountability mapping for circulation**: the audit `accountability` CHECK
  has no member-circulation stage, so member loan requests audit as
  `uploader` (the default authenticated member stage per session-summary.md)
  and librarian actions as `operator` — flagged for confirmation.

## Development

- `npm run typecheck` — TypeScript over app + scripts.
- `npm run gen:api` — regenerate API types after any `openapi.yaml` change.
- Every mutable table carries `version` for optimistic locking; every mutation
  path must write `audit_events` and `outbox_events` in the same transaction
  (see `docs/design/database-schema.md` conventions) — enforced in step 2
  service code.
