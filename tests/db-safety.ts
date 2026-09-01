const TEST_DATABASE_NAME = /(^|_)test(_|$)/i;

function parseDatabaseUrl(value: string, variable: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${variable} must be a valid PostgreSQL URL.`);
  }
}

function assertTestDatabaseName(url: URL) {
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!databaseName || !TEST_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing stateful tests: database "${databaseName || "(missing)"}" is not explicitly named as a test database.`,
    );
  }
}

/** Configure the stateful suite before importing code that creates the shared DB pool. */
export function configureIsolatedTestDatabase() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      "Refusing stateful tests: TEST_DATABASE_URL is required. Use an isolated migrated and seeded test database.",
    );
  }
  assertTestDatabaseName(parseDatabaseUrl(testDatabaseUrl, "TEST_DATABASE_URL"));
  process.env.DATABASE_URL = testDatabaseUrl;
}

/** Guard direct test-file execution, where the runner cannot configure DATABASE_URL first. */
export function assertIsolatedTestDatabase() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  if (!testDatabaseUrl || !databaseUrl || testDatabaseUrl !== databaseUrl) {
    throw new Error(
      "Refusing stateful tests: DATABASE_URL and TEST_DATABASE_URL must explicitly match an isolated test database.",
    );
  }
  assertTestDatabaseName(parseDatabaseUrl(testDatabaseUrl, "TEST_DATABASE_URL"));
}
