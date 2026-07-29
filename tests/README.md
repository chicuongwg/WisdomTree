# Tests

This directory contains test files for the WisdomTree repository.

## Structure

- `tests/unit/` - unit tests for functions and small modules.
- `tests/integration/` - integration tests for API, DB, and service interactions.
- `tests/run-all.ts` - simple runner for test files in a directory.

## Running tests

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:tests`

Each test file should export a `run()` function and may also run itself when executed directly.
