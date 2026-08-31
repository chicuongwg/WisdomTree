# WisdomTree

Storage-first knowledge platform for a small team — a modular monolith built as
**Next.js (App Router) + Drizzle ORM + PostgreSQL**, one deployable.

Documentation for the system as built lives under [docs/](docs/README.md). The product is
three things and deliberately no more (refactor 2026-08-22 removed the rest):

1. **Task & project management** — Kanban board, deadlines, calendar/ICS.
2. **Secure internal wiki** — space-scoped team knowledge plus private notes,
   safe Markdown, hierarchy, version history, search, VI/EN pages, one review
   boundary for shared content, graph navigation, and immutable per-space
   Markdown/XML releases mirrored to Git. The Library stores source files and
   physical books alongside the wiki.
3. **User management** — Google OIDC sign-in (invite-only), DB-backed
   sessions with an inactivity timeout, a per-account traffic cap, and a
   3-role model (thành viên / biên tập / quản trị).

Local dev substitutions: local-FS object store, in-process extraction stub,
in-app-only notifications, local bare content repo.

## Quickstart

```sh
npm install
npm run setup:system   # once per machine; Pandoc + PDF/OCR tools
npm run demo   # docker compose up db → migrate → seed → build → start
```

`git clone` cannot safely run commands by itself. For direct host installs,
run `npm run setup:system` once. Deployments built from the included
`Dockerfile` already contain these tools and need no host setup.

Dev, demo, and direct host production start PostgreSQL in Docker before
opening the server. To start only the database:

```sh
npm run runtime:up
```

Or step by step:

```sh
npm run runtime:up        # PostgreSQL 16
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

Sign-in is Google OIDC: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
`APP_URL` (see [.env.example](.env.example)). Outside production, `/login`
also shows a seeded-member demo picker so local testing needs no Google
configuration — that picker and its endpoint do not exist in production
builds (no env override; stricter than the old `ENABLE_DEV_LOGIN`).
Access is invite-only — an Admin/Op invites an email from the Admin Console,
and that person's first Google login claims the account; anyone else is
turned away as not invited. For the demo seed, set `SEED_ADMIN_EMAIL` to
your own Gmail so your first login lands as the invited admin; tests sign in
by inserting a session row directly (see `tests/e2e/global-setup.ts`).

Sessions idle out after `SESSION_IDLE_MS` (default 30 minutes) with a 7-day
absolute cap, and every signed-in account is throttled to `USER_RATE_LIMIT`
requests per minute (default 240).

### Configuration required before any real deployment

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

- `knowledge/service.ts` re-exports the core, query, mutation, and
  publication slices.
- `components/knowledge-map.tsx` and `lib/vi.ts` preserve existing imports while
  their implementations live in same-named directories.

See [docs/architecture.md](docs/architecture.md) for the module map and
[tests/README.md](tests/README.md) for the verification layers.

## Deploying

One image, one compose stack. Migrations run as a one-shot service before the
app starts, and never seed.

```sh
export SESSION_SECRET=$(openssl rand -base64 32)   # required, no default
export CRON_SECRET=$(openssl rand -base64 32)      # outbox safety cron
export TRUST_PROXY=1                               # only behind a trusted proxy
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

| Concern              | Where it is handled                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Uploads + wiki repos | `appdata` volume on `/app/data` — without it, a redeploy deletes uploaded files and Git mirrors |
| Migrations           | `migrate` service, runs to completion before `app` starts                                       |
| Health               | `GET /api/health` (unauthenticated, `SELECT 1`), wired to the container healthcheck             |
| Backups              | `scripts/backup.sh` — `pg_dump` plus object-store and wiki-repo tarballs, on cron               |

The image carries `git` (wiki release mirrors), `pandoc`, Poppler, and
Tesseract with Vietnamese language data — PDF/image text extraction and OCR.
(The docx/pdf document-render pipeline was removed with the 2026-08-22
refactor.)

Back up the database, uploaded objects, and wiki Git mirrors together: a
database row whose file or projection is missing is not a complete recovery
set.

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

| Path                                  | What it is                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `docs/`                               | Documentation for the system as built (start at `docs/README.md`)                                              |
| `drizzle/`                            | Forward-only SQL migrations (tracked in `schema_migrations`)                                                   |
| `src/modules/<module>/`               | Module boundaries (see `docs/architecture.md`); large services use a thin facade plus cohesive internal slices |
| `src/modules/*/schema.ts`             | Drizzle table definitions owned by that module                                                                 |
| `src/app/components/knowledge-map/`   | Graph renderer model, responsive media hook, and component implementation                                      |
| `src/lib/vi/`                         | Vietnamese copy and state-label implementation behind the `src/lib/vi.ts` facade                               |
| `src/modules/storage/object-store.ts` | Dev substitution: local FS now, S3 in V1                                                                       |
| `src/modules/storage/extraction.ts`   | In-process OCR/pandoc extraction (tesseract with Vietnamese data)                                              |
| `src/db/`                             | Drizzle client, aggregated schema, cross-cutting outbox table                                                  |
| `scripts/db/`                         | Migration runner and seed script                                                                               |
| `tests/`                              | Unit, integration, and Playwright suites; module, contract, and UI audits are wired through package scripts    |
