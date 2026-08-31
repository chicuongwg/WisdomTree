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
missing), `CRON_SECRET` (deadline-reminder cron), `TRUST_PROXY=1` only
behind a proxy that rewrites forwarding headers, the Google OIDC
triple, and the tunables `SESSION_IDLE_MS`, `USER_RATE_LIMIT`,
`EDIT_LOCK_TTL_MS`.

`VAULT_GIT_DIR` optionally changes the directory containing per-space bare Git
mirrors (default `./data/vault-repos`).

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

- Housekeeping tick: `POST /api/cron/dispatch` with
  `Authorization: Bearer $CRON_SECRET` — deadline reminders (the one
  time-driven notification producer; everything else is written by its
  mutation) plus the stale-session purge.
- Backups: `scripts/backup.sh [dest]` — `pg_dump` plus separate verified
  tarballs of the object store and `VAULT_GIT_DIR` (suggested crontab inside
  the script). Keep all artifacts from the same run together.

## Wiki releases

Migration `0036_wiki_title_preflight.sql` stops if two active pages in one
space share a normalized Vietnamese or English title. Resolve the reported
titles before retrying; the migration does not rename content automatically.

Managers use `/wiki/releases` to create, verify, or rebuild a space release;
Admin/Op has cross-space knowledge access. The equivalent endpoints are:

- `GET|POST /api/spaces/{spaceId}/wiki/releases`
- `POST /api/wiki/releases/{releaseId}/verify`
- `POST /api/wiki/releases/{releaseId}/rebuild`

Creation fails rather than publishing when a wiki link is unresolved or the
safe-Markdown validator reports an error. Verify checks the current Git tree
against both the immutable database snapshot and its manifest hash. Rebuild
restores that exact snapshot; it never regenerates from today's editable wiki.

## Tests

`npm test` = lint + typecheck + unit + boundaries + sign/time contracts and
contrast audit. `npm run test:integration` needs the seeded local DB.
`npm run test:e2e` builds on a standalone build; its global-setup signs in by
inserting a session row (no in-app backdoor). On NixOS the bundled Playwright
chromium lacks system libs — point `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` at a
system chromium.
