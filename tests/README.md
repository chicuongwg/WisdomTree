# Tests

This directory contains test files for the WisdomTree repository.

## Structure — four tiers

- `tests/unit/` — pure logic, no DB: the authorize() catalog contract
  (role gates, 404-vs-403, space ladder), the line diff, the error
  translator, graph settings/model invariants, content helpers.
- `tests/integration/` — one service area against the seeded DB: session
  resolution + inactivity timeout, edit locks (conflict, save guard,
  stale-heartbeat takeover), book/loan guard rails, the two review
  boundaries (maker-checker).
- `tests/usecase/` — end-to-end user journeys at the service layer:
  the knowledge lifecycle (write → live edit → history/diff/restore →
  promote → locked page → reviewed change), a book's life (shelve →
  find under "Sách" → borrow → return → register), and an account's
  life (invite → promote → disable revokes sessions → re-enable →
  lockout guards).
- `tests/privacy/` — isolation and leak rules: out-of-scope reads are
  404 (never 403), personal vaults are invisible on every read surface
  and untouchable from outside, tokens are stored only as hashes,
  revocation is immediate, self-service cannot touch role/email/sub,
  account enumeration and audit are admin-only, notifications are
  owner-only, and the demo-login gate closes in production.
- `tests/e2e/` — Playwright smoke tests against the production
  standalone server (signs in via a session row from global-setup).
- `tests/run-all.ts` — simple runner; `tests/setup.ts` provides
  `issueTestSession` and `principalFor`.

Stateful tests require an explicit isolated database through
`TEST_DATABASE_URL`. The runner assigns that URL to `DATABASE_URL` before it
imports application code. Database names must include a distinct `test`
segment, and direct stateful test-file execution must set both variables to the
same URL. This prevents test fixtures from reaching the normal application
database.

Module, contract, and UI checks live under `scripts/` because they validate
repository-wide structure or generated artifacts rather than one runtime
module.

## Running tests

- `npm run test:unit`
- `npm run test:boundaries` — layer/dependency boundaries
- `npm run test:sign` / `test:time` — signed-token and timezone contracts
- `npm run test:contrast` — WCAG contrast audit over globals.css
- `npm run test:integration`
- `npm run test:usecase` — service-layer user journeys
- `npm run test:privacy` — isolation and leak rules
- `npm run test:e2e`
- `npm test` — fast, infrastructure-free gate
- `npm run test:all` — integration, production build, and Playwright after the fast gate

Each test file should export a `run()` function and may also run itself when executed directly.

Integration, use-case, and privacy tests expect an isolated PostgreSQL database
to be created, migrated, and seeded before the command starts. Tests never seed
implicitly because the demo seed is destructive. For example, with a temporary
database named `wisdomtree_test_<run>`:

```sh
export TEST_DATABASE_URL=postgres://.../wisdomtree_test_<run>
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
DATABASE_URL="$TEST_DATABASE_URL" ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
npm run test:integration
npm run test:usecase
npm run test:privacy
```

Dispose the temporary database after the run. A bare stateful suite command or
direct test invocation now fails closed before fixture mutation.

`test:all` runs this gate in order:

```text
lint + typecheck
  -> unit + module + contract + UI checks
  -> PostgreSQL integration + usecase + privacy
  -> production build
  -> Playwright E2E via scripts/start-e2e.mjs
```

The E2E harness copies `public/` and `.next/static/` into the standalone build
tree before starting it. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` is optional and
is intended for environments such as Nix where Chromium is supplied outside
Playwright's normal browser cache.
