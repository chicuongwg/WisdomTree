import assert from "node:assert";
export const run = async () => {
  // Integration setup owns migration and fixtures; individual tests never
  // wipe a database halfway through the suite.
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDevLogin = process.env.ENABLE_DEV_LOGIN;
  try {
    process.env.ENABLE_DEV_LOGIN = "1";
    (process.env as Record<string, string>).NODE_ENV = "development";

    const mod = await import("@/modules/auth/dev-auth");
    const { listSignInCandidates, findSignInCandidate } = mod;

    const users = await listSignInCandidates();
    assert.ok(Array.isArray(users) && users.length >= 1, "seeded users should exist");
    const u = users[0];
    const found = await findSignInCandidate(u.id);
    assert.ok(found && found.id === u.id, "findSignInCandidate must resolve the seeded user");
    assert.equal(await findSignInCandidate(crypto.randomUUID()), null);
  } finally {
    if (previousNodeEnv === undefined) delete (process.env as Record<string, string>).NODE_ENV;
    else (process.env as Record<string, string>).NODE_ENV = previousNodeEnv;
    if (previousDevLogin === undefined) delete process.env.ENABLE_DEV_LOGIN;
    else process.env.ENABLE_DEV_LOGIN = previousDevLogin;
  }
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
