# Architecture

One deployable: **Next.js (App Router) + Drizzle ORM + PostgreSQL**, a
modular monolith. No workers, no queues, no second service.

## Layers (enforced, not aspirational)

| Layer | Path | May do | May not do |
| --- | --- | --- | --- |
| Delivery | `src/app/**` | Render, read params, call a service | Touch the DB — no `@/db`, no `*/schema`, no `drizzle-orm` |
| Business logic | `src/modules/<module>/*` | Authorize, query, transact, audit | Reach into another module's tables |
| Data | `src/db/**`, `src/modules/*/schema.ts` | Connection, tables, migrations | Contain business rules |

`scripts/boundaries.test.ts` greps the delivery layer for DB imports on
every `npm test`; it has caught a real cross-space leak.

## Modules

- **auth** — users, sessions, the `authorize()` catalog, admin user
  management, OIDC, the dev-only demo login.
- **storage** — spaces & membership, folders, sources (files) with
  versioning, OCR/pandoc extraction (`extraction.ts`, in-process),
  extraction candidates ("my OCR imports"), categories, and
  `physical.ts`: books as Library items (`source_physical`, 1:1 with
  `sources`).
- **circulation** — the loan state machine
  (`requested → approved → borrowed → returned`, + declined/overdue) over
  physical items; one active loan per item enforced by a partial unique
  index.
- **knowledge** — vaults, branches, tree nodes with markdown content,
  append-only `tree_node_versions`, wiki/typed links, tags, the two
  proposal tables, promotions (provenance), and `edit-lock.ts`.
- **pm** — tasks (board), deadlines (+reminders, checklists, links),
  calendar tokens/ICS.
- **notify** — comments with inline `@mentions`, the in-app notification
  center, per-event opt-out, and the fan-out (`fanout.ts`).
- **export** — synchronous one-way markdown tree export into the local
  bare git repo `data/content-repo.git` (plain files + front-matter),
  plus the admin health report.
- **audit** — the `recordAudit` helper; `audit_events` is
  append-only (DB trigger) and read back on `/admin`.
- **graph** — the read-side provider feeding the graph view.

## Authorization

`authorize(actor, permission, resource)` is the single gate
(`src/modules/auth/authorize.ts`). Roles carry the vertical axis
(user/editor/admin_op — no capability table, no vault grants); the
**scope** qualifier does the per-record work: `global`, `space` (with a
viewer<contributor<manager ladder over `space_members`), `self`, and
`owned-or-assigned`. Denied reads throw 404 (no existence leak); denied
writes throw 403.

Vault visibility derives from the vault itself: a `shared` vault is
visible to every member, a `personal` vault only to its owner
(`branchVisibilityCondition`).

## Sessions, timeout, traffic cap

- Sessions are server-side rows (`sessions`), the cookie holds a random
  token and the DB only its SHA-256. Revocable per user (and revoked on
  disable).
- **Inactivity timeout**: `last_seen_at` is written on every request and
  read on resolve — idle past `SESSION_IDLE_MS` (default 30 min) reads
  as signed out; `SESSION_TTL_MS` (7 days) is the absolute cap.
- **Traffic cap**: every resolved principal passes
  `enforceUserRateLimit` (default 240 req/min per account, in-process —
  fine for the single-instance deployment).
- **Demo login** (`auth/dev-login.ts`): a seeded-member picker that
  exists only when `NODE_ENV !== "production"`; no env override.
  Automated tests do not use it — they insert a session row directly
  (`tests/setup.ts`, `tests/e2e/global-setup.ts`).

## Two-tier editing (the heart of the knowledge model)

- **Personal branches: live edit.** `updateNode` saves immediately under
  an optimistic version check; every content change appends a
  `tree_node_versions` row. `/tree/node/:id/history` shows the chain,
  diffs any two versions (`src/lib/diff.ts`, line LCS) and restores by
  appending — history is never rewritten (append-only trigger).
- **Promotion is the single review boundary.** A personal node is
  proposed onto a team branch (`node_publication_proposals`); an
  independent reviewer (editor/admin, never the submitter or author —
  `assertIndependentReviewer`) decides; approval creates the promoted
  node and a `promotions` provenance row.
- **Promoted nodes are locked.** In-place saves are refused
  (`review_required`); changes travel as `node_change_proposals`,
  decided the same way, applied under the proposal's base-version check.
- **Single-writer edit locks.** Opening the live editor takes the node's
  lock (`node_edit_locks`, keyed by *login session*, so the same person
  in a second browser is also refused). Re-POSTing the lock is the
  heartbeat; a heartbeat older than `EDIT_LOCK_TTL_MS` (90 s) frees it.
  The lock is enforced in `updateNode`, shown as 🔒 with the holder's
  name in the UI, and the optimistic version check remains the final
  guard.

## Library, books, loans

Books are Library items: the `sources` row carries title/space/category
("Sách" is seeded; more categories are an INSERT), `source_physical`
carries the shelf facts (LIB-code, author, location, copies, status).
Loans hang off the physical row; state transitions, the copies-vs-loans
guards, and the per-item loan register live in `circulation/service.ts`.
The loan desk is `/library/loans`; the item page hosts request/approve/
hand-over/return.

## Notifications

Mutations call `notifyEvent` inside their own transaction
(`notify/fanout.ts`): recipients come from the event matrix, per-event
opt-out from `notification_preferences`, and the in-app center is the
only channel (deliveries are still recorded per channel, so a future
email/zalo adapter starts from data, not a stub). Deadline reminders are
the one time-driven producer: the `POST /api/cron/dispatch` cron fires
them exactly-once via the `(deadline_id, offset)` PK.

## Graph view

Server: `modules/graph/provider.ts` loads visible nodes/edges/tags.
Client: `src/app/components/knowledge-map/` renders them with the
open-source **force-graph** engine (canvas 2D, d3-force). The component
owns product behavior — verification shapes (circle/diamond/square),
label LOD, per-link-type colors/arrows, hover preview cards, context
menu, keyboard navigation with aria-live, the filter pipeline, ego mode
(`?node=&depth=`), and the settings panel whose seven sliders map to
d3 forces with the invariant *slider midpoint = shipped default*
(unit-tested). Client-only: no SSR graph markup.

## Extraction (OCR)

`storage/extraction.ts` routes by MIME: images/PDF → tesseract (with
Vietnamese language data), docx/odt/html → pandoc, text → direct. The
assembled markdown lands in `extraction_candidates`; the uploader
evolves it into a node in their personal branch, and review happens only
at promotion. Failure never blocks storage — the original file is
always kept and downloadable.

## Error contract

`ApiError { status, code, message(EN), details? }`. Codes are stable;
the FE translates by code (`src/lib/vi/errors.ts`), interpolating from
`details` (e.g. `holderName`, `onLoan`, `retryAfterSeconds`), and falls
back to the English message for unknown codes. `change_summary` values
in `tree_node_versions` are stable English codes translated at render.
