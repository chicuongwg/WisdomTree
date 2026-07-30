# WisdomTree

Storage-first knowledge platform for a small team — a modular monolith built as
**Next.js (App Router) + Drizzle ORM + PostgreSQL**, one deployable, per the
stack pin in [docs/roadmap/demo-brief.md](docs/roadmap/demo-brief.md).

Planning and design docs live under [docs/](docs/README.md); they are the
canonical baseline. This tree is the **V1-local build**: the accepted demo
(Happy Path 0 + catalog/circulation) plus the knowledge module
(curation → review → publish with provenance, tree browse/search),
notifications with comments and channel preferences, PM (deadlines, board,
ICS feed), the export module (document render + one-way tree export to a
local content repo), the "Chàm & Son" UI identity, and the matrix-driven
authorization test suite. External services still run behind the approved
dev-mode substitutions (user-picker auth, local object store, in-process
extraction stub, console notification adapters, local bare content repo).

## Quickstart

```sh
npm install
npm run setup:system   # once per machine; Pandoc + PDF/OCR tools
npm run demo   # docker compose up db → migrate → seed → build → start
```

`git clone` cannot safely run commands by itself. For direct host installs,
run `npm run setup:system` once. Deployments built from the included
`Dockerfile` already contain these tools and need no host setup.

Dev, demo, and direct host production start PostgreSQL and Ollama in Docker
before opening the server. The first run pulls `OLLAMA_MODEL` (default
`qwen2.5:7b`); the model stays in the `ollamadata` volume, so later starts do
not download it again. To start only these dependencies:

```sh
npm run runtime:up
```

Ollama is bound to host loopback at `127.0.0.1:11434`, not exposed to the LAN.
The deploy Compose profile uses the same container and reaches it over the
internal Docker network.

Or step by step:

```sh
npm run runtime:up        # PostgreSQL 16 + Ollama + configured model
npm run db:migrate        # applies drizzle/*.sql (forward-only, tracked)
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed   # see the warning below
npm run build && npm run start   # http://localhost:3000
```

> **`npm run demo` and `npm run db:seed` wipe the database.** The seed
> TRUNCATEs every table — including `users` and `spaces` — before inserting the
> fixtures, so it is a first-install and local-development command, never a
> restart command. It refuses to run without `ALLOW_DESTRUCTIVE_SEED=1` for
> that reason. **To restart a deployment without touching its data, use
> `npm run start:prod`** (migrate, then start).

### Fresh database without demo data

For a real installation, migrate an empty PostgreSQL database and run the
non-destructive bootstrap once. Do not run the demo seed.

```sh
npm run db:migrate
npm run db:bootstrap -- \
  --admin-email admin@example.org \
  --admin-name "Initial Administrator" \
  --shared-vault-name "Team Knowledge"
```

The names and email are operator input, not application fixtures. Bootstrap
creates only the initial `admin_op` invitation, that user's personal vault,
one shared vault, required capabilities, and an audit event. It refuses to run
when the database already contains a user or vault and never deletes data.
Configure Google OIDC, then sign in with the invited email; subsequent users,
spaces, branches, and content are created through the application.

**Use the built app, not `next dev`, for anything but editing code.** Every
page is dynamic, so a dev server compiles each route the first time it is
opened: measured on this repo, first paint runs 0.6–3.0 s per route and stays
70–200 ms afterwards, against 9–15 ms served from a build. Nothing in the app
is slow — the wait is webpack. While editing, `npm run dev` uses Turbopack,
which cuts the compile pause substantially; `npm run dev:webpack` keeps the
old bundler if a Turbopack bug ever needs ruling out.

Never run `npm run build` while a dev server is up: both write `.next` and the
result is a corrupted server that 404s every route or fails with `Cannot find
module './vendor-chunks/...'`. Stop the server, `rm -rf .next`, then build.

`npm run build` now checks this itself — a `prebuild` hook refuses when
something is listening on the app port, because a warning you have to remember
is weaker than a check that runs itself. Override with
`SKIP_PORT_CHECK=1 npm run build` when the port belongs to something unrelated.

Seeded per the brief's acceptance criteria: 3 users (User/Editor/Admin-Op),
2 team spaces (one is the community library) + a personal space per user,
10 stored sources with mixed extraction states, 20 catalog items, 1 active loan.

Sign-in is the dev-mode user picker (demo substitution): open the app and
choose a seeded member; V1 swaps in Google OIDC behind the same session shape.

Real sign-in is Google OIDC: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`APP_URL` (see [.env.example](.env.example)) and `/login` grows a Google button.
Access is invite-only — an Admin/Op invites an email from the Admin Console,
and that person's first Google login claims the account; anyone else is turned
away as not invited.

### Configuration required before any real deployment

The picker is an impersonation endpoint — it trades a user id for that user's
session with no credential — so it is **off in production** unless
`ENABLE_DEV_LOGIN=1` is set, and with it off `/login` does not enumerate users
either. A real deployment should leave it off and configure Google OIDC.

`DATABASE_URL` and `SESSION_SECRET` are **required in production**. The app
refuses to use its local development database default at runtime, and refuses
to sign with the published development secret. Generate the latter with
`openssl rand -base64 32`. Configuration is documented in
[.env.example](.env.example).

## Layers

One deployable, three layers, enforced rather than described:

| Layer                  | Path                                   | May do                                    | May not do                                                      |
| ---------------------- | -------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| Delivery (FE + routes) | `src/app/**`                           | Render, read query params, call a service | Touch the database — no `@/db`, no `*/schema`, no `drizzle-orm` |
| Business logic         | `src/modules/<module>/*.ts`            | Authorize, query, transact, audit, emit   | Reach into another module's tables                              |
| Data                   | `src/db/**`, `src/modules/*/schema.ts` | Connection, table definitions, migrations | Contain business rules                                          |

```sh
npm run test:boundaries   # fails the build if delivery code queries the database
```

This is not house style. The one page that queried the database directly was
also the one page with a cross-space leak, because the predicate a service
would have carried was simply absent. Keeping the query in the service keeps it
next to the `authorize()` call and the space scoping that belong with it.

Server components calling a service directly is intended — that is the App
Router's own model, and the service is still the only thing that talks to
Postgres. The rule is about _who owns the query_, not about inserting an HTTP
hop between a page and its data.

```sh
npm test   # fast checks: lint, typecheck, unit, boundaries, authz, tokens, UI audits
```

The full gate additionally needs a migrated, demo-seeded test database. It
builds the production app and runs the integration and Playwright suites:

```sh
npm run test:all
```

Large public entry points remain compatibility facades while cohesive code is
split behind them:

- `knowledge/service.ts` re-exports the core, query, and mutation slices.
- `storage/curation.ts` re-exports curation core, query, and workflow slices.
- `components/knowledge-map.tsx` and `lib/vi.ts` preserve existing imports while
  their implementations live in same-named directories.

See [docs/platform/module-map.md](docs/platform/module-map.md) for the current
module/file map and [tests/README.md](tests/README.md) for the verification
layers.

## Deploying

One image, one compose stack. Migrations run as a one-shot service before the
app starts, and never seed.

```sh
export SESSION_SECRET=$(openssl rand -base64 32)   # required, no default
export CRON_SECRET=$(openssl rand -base64 32)      # outbox safety cron
export TRUST_PROXY=1                               # only behind a trusted proxy
export ENABLE_DEV_LOGIN=1                          # until OIDC lands; see above
docker compose --profile deploy up -d --build
```

The app port is bound to host loopback. The reverse proxy must remove incoming
forwarding headers and write its own before `TRUST_PROXY=1` is enabled. The
outbox safety cron calls `POST /api/cron/dispatch` with
`Authorization: Bearer <CRON_SECRET>`.

`--profile deploy` is what separates this from `docker compose up -d db`, which
stays the database-only path the npm scripts use. Compose refuses to start
without `SESSION_SECRET` rather than letting the published dev default sign
real sessions.

| Concern               | Where it is handled                                                                  |
| --------------------- | ------------------------------------------------------------------------------------ |
| Uploads + export repo | `appdata` volume on `/app/data` — without it, a redeploy deletes every uploaded file |
| Migrations            | `migrate` service, runs to completion before `app` starts                            |
| Health                | `GET /api/health` (unauthenticated, `SELECT 1`), wired to the container healthcheck  |
| Backups               | `scripts/backup.sh` — `pg_dump` plus a tarball of the object store, on cron          |

The image carries `git`, `pandoc`, Poppler, and Tesseract with Vietnamese
language data. There is no TeX engine, so PDF export degrades to the HTML
artifact with a converter warning; PDF input extraction and OCR are supported.

Back up **both** halves or neither: a database row whose file is missing is not
a restorable source.

```sh
./scripts/backup.sh /srv/backups        # nightly, via cron — see the script header
```

### Acceptance proofs

With the app running (`npm run demo`, or `npm run start` after a build):

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

| Path                                  | What it is                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `docs/`                               | Canonical planning + design baseline (read `docs/roadmap/demo-brief.md` first)                                          |
| `drizzle/0000_init.sql`               | First migration, transcribed from `docs/design/database-schema.md` (demo subset)                                        |
| `src/modules/<module>/`               | Module boundaries per `docs/platform/module-map.md`; large services may use a thin facade plus cohesive internal slices |
| `src/modules/*/schema.ts`             | Drizzle table definitions owned by that module                                                                          |
| `src/app/components/knowledge-map/`   | Graph renderer model, responsive media hook, and component implementation                                               |
| `src/lib/vi/`                         | Vietnamese copy and state-label implementation behind the `src/lib/vi.ts` facade                                        |
| `src/modules/storage/object-store.ts` | Dev substitution: local FS now, S3 in V1                                                                                |
| `src/modules/storage/extraction.ts`   | Dev substitution: in-process stub worker                                                                                |
| `src/modules/auth/dev-auth.ts`        | Dev substitution interface: user-picker sessions, OIDC in V1                                                            |
| `src/db/`                             | Drizzle client, aggregated schema, cross-cutting outbox table                                                           |
| `scripts/db/`                         | Migration runner and seed script                                                                                        |
| `tests/`                              | Unit, integration, and Playwright suites; module, contract, and UI audits are wired through package scripts             |

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

1. ~~`branch_gap_requests.converted_branch_id` / `converted_node_id` are plain
   uuid columns without their FK constraints~~ — **resolved by migration 0001**:
   the knowledge tables now exist and both FK constraints are in place.
2. ~~`catalog_items.import_id` likewise lacks its FK to `bridge_imports`~~ —
   **resolved by migration 0001**: `bridge_imports` now exists and the FK is
   in place.
3. `text_chunks` / `audit_events` immutability is enforced by trigger only;
   the second layer (revoking UPDATE/DELETE grants from a dedicated app role)
   needs a separate DB role, deferred to V1 deployment.
4. The tsvector columns use an `immutable_unaccent()` wrapper because raw
   `unaccent()` is not IMMUTABLE and cannot appear in a generated column —
   standard PostgreSQL practice, same semantics as the doc.
5. ~~`notification_deliveries` / `notification_preferences` are omitted~~ —
   **resolved by migration 0001**: both tables now exist per the schema doc;
   the demo dispatcher still writes only in-app `notifications` until the V1
   email/Zalo channels land.
6. ~~The cross-cutting `jobs` table is omitted~~ — **resolved by migration
   0001**: the table now exists; the demo extraction stub does not yet write
   to it (the real worker does in V1).

All six deviations reviewed and approved by the coordinator on 2026-07-20
(gate 1 passed); items 1, 2, 5, and 6 were closed by migration
`0001_v1_schema_parity.sql`, leaving only the grant-revoke item (3) as a V1
deployment obligation.

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
- **Accountability mapping for circulation**: resolved by migration 0001 per
  the decision-log gate-2 ruling — the audit `accountability` CHECK now
  includes `member`, borrower-initiated loan actions audit as `member`, and
  librarian actions as `operator`.

## Development

- `npm run typecheck` — TypeScript over app + scripts.
- Every mutable table carries `version` for optimistic locking; every mutation
  path must write `audit_events` and `outbox_events` in the same transaction
  (see `docs/design/database-schema.md` conventions) — enforced in step 2
  service code.
