# Tests

This directory contains test files for the WisdomTree repository.

## Structure

- `tests/unit/` - unit tests for functions and small modules.
- `tests/integration/` - integration tests for API, DB, and service interactions.
- `tests/e2e/` - Playwright smoke tests against the production standalone server.
- `tests/run-all.ts` - simple runner for test files in a directory.

Module, contract, and UI checks live under `scripts/` because they validate
repository-wide structure or generated artifacts rather than one runtime
module.

## Running tests

- `npm run test:unit`
- `npm run test:modules` — dependency boundaries and authorization matrix
- `npm run test:contract` — signed-token and timezone contracts
- `npm run test:ui` — contrast and diagram layout audits
- `npm run test:integration`
- `npm run test:e2e`
- `npm test` — fast, infrastructure-free gate
- `npm run test:all` — integration, production build, and Playwright after the fast gate

Each test file should export a `run()` function and may also run itself when executed directly.

Integration and full tests expect PostgreSQL to be migrated and seeded before
the command starts. Tests never seed implicitly because the demo seed is
destructive:

```sh
npm run db:up
npm run db:migrate
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
npm run test:all
```

`test:all` runs this gate in order:

```text
lint + typecheck
  -> unit + module + contract + UI checks
  -> PostgreSQL integration
  -> production build
  -> Playwright E2E via scripts/start-e2e.mjs
```

The E2E harness copies `public/` and `.next/static/` into the standalone build
tree before starting it. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` is optional and
is intended for environments such as Nix where Chromium is supplied outside
Playwright's normal browser cache.
