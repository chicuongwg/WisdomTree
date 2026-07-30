import assert from "node:assert";
import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/modules/auth/session";

export const run = async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDevLogin = process.env.ENABLE_DEV_LOGIN;
  try {
    process.env.ENABLE_DEV_LOGIN = "1";
    (process.env as Record<string, string>).NODE_ENV = "development";

    const { listSignInCandidates } = await import("@/modules/auth/dev-auth");
    const users = await listSignInCandidates();
    assert.ok(users.length > 0, "expected seeded users to be present");
    const user = users[0];

    const { POST } = await import("@/app/api/auth/dev-login/route");
    const response = await POST(
      new NextRequest("http://localhost/api/auth/dev-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      userId: user.id,
      displayName: user.displayName,
      role: user.role,
    });

    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie, "response must set a session cookie");
    assert.match(setCookie, new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=`));
    assert.match(setCookie, /httponly/i);
    assert.match(setCookie, /samesite=lax/i);
    assert.match(setCookie, /path=\//i);
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
