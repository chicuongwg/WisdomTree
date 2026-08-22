# Operations

## Local development

```sh
npm install
npm run setup:system     # once per machine: pandoc + poppler + tesseract(-vie)
npm run demo:dev         # db up → migrate → destructive seed → next dev
# or, non-destructively:
npm run runtime:up && npm run db:migrate && npm run dev
```

Sign-in on a dev machine: the demo picker on `/login` (exists only when
`NODE_ENV !== "production"`). Real sign-in is Google OIDC —
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`; access is
invite-only. For a seeded demo you can reach with your own Gmail, set
`SEED_ADMIN_EMAIL` before `db:seed`.

**`db:seed` TRUNCATEs every table** and refuses to run without
`ALLOW_DESTRUCTIVE_SEED=1`. To restart without touching data:
`npm run start:prod`. First install on a real empty DB:
`npm run db:bootstrap -- --admin-email … --admin-name …` (non-destructive).

Do not run `npm run build` while a dev server is using the same `.next`
(turbopack and webpack artifacts corrupt each other; symptom:
`Cannot find module '[turbopack]_runtime.js'` — fix: stop the server,
`rm -rf .next`).

## Environment

See [.env.example](../.env.example) for the full list. The ones that
matter in production: `DATABASE_URL` and `SESSION_SECRET` (both refused
missing), `CRON_SECRET` (outbox safety cron), `TRUST_PROXY=1` only
behind a proxy that rewrites forwarding headers, the Google OIDC
triple, and the tunables `SESSION_IDLE_MS`, `USER_RATE_LIMIT`,
`EDIT_LOCK_TTL_MS`.

## Deploy

```sh
export SESSION_SECRET=$(openssl rand -base64 32)
export CRON_SECRET=$(openssl rand -base64 32)
export TRUST_PROXY=1
docker compose --profile deploy up -d --build
```

One image; the `migrate` service runs `drizzle/*.sql` to completion
before `app` starts and never seeds. The `appdata` volume holds
`/app/data` (uploads, the export content repo) — without it a redeploy
deletes every uploaded file. Health: `GET /api/health` (unauthenticated
`SELECT 1`), wired to the container healthcheck. The image carries
`git`, `pandoc`, poppler and tesseract with Vietnamese data.

Cron, on the host:

- Outbox safety net: `POST /api/cron/dispatch` with
  `Authorization: Bearer $CRON_SECRET` (dispatch already runs after
  every mutation; this catches anything a crash left behind).
- Backups: `scripts/backup.sh [dest]` — `pg_dump` plus a tarball of the
  object store (suggested crontab inside the script).

## Tests

`npm test` = lint + typecheck + unit + boundaries + sign/time contracts
+ contrast audit. `npm run test:integration` needs the seeded local DB.
`npm run test:e2e` builds on a standalone build; its global-setup signs
in by inserting a session row (no in-app backdoor). On NixOS the
bundled Playwright chromium lacks system libs — point
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` at a system chromium.
