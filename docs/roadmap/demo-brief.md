# Demo Brief

## Purpose

- Define the exact scope, constraints, and acceptance bar for the first runnable demo, so a build agent can execute it end-to-end without reopening any decision.
- This is the hand-off document: paste it (or point to it) as the build agent's instruction, together with the reading order below.

## In Scope

- Happy Path 0 end-to-end: sign in (dev auth) → upload into a member space → item `stored` → visible in Library → search → open detail → download original.
- Basic catalog and circulation: browse catalog, request loan, librarian approve → borrow → return.
- Seed data, Vietnamese-default UI, and a one-command dev run.

## Out of Scope

- Curation, review, publish, Knowledge Tree, graph, export, Quartz.
- Google bridges (Drive/Sheets/Forms/Calendar), Zalo OA and email delivery, Ollama/OCR.
- Real Google OIDC, real S3, separate worker host, backups, deployment.

## Decisions

- Framework pin: **Next.js (App Router) + Drizzle ORM + PostgreSQL**, one deployable, per the accepted stack's "boring, single deployable" rule. Deviating from this pin requires a decision-log entry, not an agent preference.
- Module folders follow [`../platform/module-map.md`](../platform/module-map.md) from day one (`storage`, `catalog`, `circulation`, `auth`, `audit`, `notify` stub); demo code is the seed of V1, not a throwaway.
- The demo implements the real schema subset from [`../design/database-schema.md`](../design/database-schema.md) and the real endpoint shapes from [`../design/openapi.yaml`](../design/openapi.yaml) for the in-scope surfaces — no invented routes or tables.
- Dev-mode substitutions (demo only, each behind an interface so V1 swaps the real thing):
  - Auth: user picker over seeded users (one per role) issuing a session; no Google OIDC.
  - Object storage: local filesystem (or MinIO via compose) behind the storage interface; downloads still go through the authorized endpoint, never a public path.
  - Extraction worker: in-process stub that marks `extraction_status` after a delay; no Python, no OCR.
  - Notifications: in-app records only; Zalo/email channels log to console.
- Delivery is two-step with an owner checkpoint between them:
  1. Scaffold: monorepo layout per module map, first migration from the schema doc, types generated from `openapi.yaml`, seed script, compose file. Stop for owner review.
  2. Build: the in-scope flows, UI per [`../ui/screen-inventory.md`](../ui/screen-inventory.md) (Home, Library, Stored Item Detail, Source Intake, My Submissions, Catalog, Catalog Item Detail, Librarian Desk) with [`../ui/vocabulary-vi.md`](../ui/vocabulary-vi.md) strings.

## Dependencies

- Reading order for the build agent: [`../session/session-summary.md`](../session/session-summary.md) → [`../platform/module-map.md`](../platform/module-map.md) → [`../design/database-schema.md`](../design/database-schema.md) → [`../design/openapi.yaml`](../design/openapi.yaml) → [`../design/authorization-design.md`](../design/authorization-design.md) → [`../ui/screen-inventory.md`](../ui/screen-inventory.md) → this brief.
- Permissions are enforced per [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md) via the single `authorize` helper design; UI hiding alone fails acceptance.

## Acceptance Criteria

- `docker compose up` (or one documented command) starts the demo with seed data: 3 users (User/Editor/Admin-Op), 2 team spaces + personal spaces, ~10 stored sources, ~20 catalog items, 1 active loan.
- **Store-first proof**: an uploaded file appears in Library and is downloadable *while* its extraction status is still `pending`; a stubbed `unprocessable` outcome does not remove it.
- Space scoping proof: a user who is not a member of space B cannot see or download space B's items (API returns 404/403, not just hidden UI).
- Loan proof: request → approve → borrow → return updates both the ticket and the item status; a second request on a borrowed item is rejected with 409.
- Optimistic-locking columns, `audit_events`, and `outbox_events` rows are written on mutations (dispatcher may be a stub that only marks dispatched).
- UI renders Vietnamese by default using the vocabulary map; English toggle may be deferred.
- All demo tables, columns, states, and routes match the design docs by name; any mismatch is a defect, not an adaptation.

## Coordinator Gate

- The owner's coordinator reviews step 1 (scaffold) before step 2 starts, and verifies the acceptance criteria above before the demo is declared done; declaring done without the store-first and space-scoping proofs is not accepted.
