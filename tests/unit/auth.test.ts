import assert from "node:assert";
import { devLoginEnabled } from "@/modules/auth/dev-auth";
import { enforceRateLimit, requestAddress } from "@/lib/rate-limit";
import { ApiError } from "@/lib/errors";

export const run = async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDevLogin = process.env.ENABLE_DEV_LOGIN;
  const previousTrustProxy = process.env.TRUST_PROXY;
  try {
    (process.env as Record<string, string>).NODE_ENV = "production";
    delete process.env.ENABLE_DEV_LOGIN;
    assert.equal(devLoginEnabled(), false, "production must not expose impersonation by default");
    process.env.ENABLE_DEV_LOGIN = "1";
    assert.equal(devLoginEnabled(), true, "production may explicitly opt in to demo login");
    (process.env as Record<string, string>).NODE_ENV = "development";
    delete process.env.ENABLE_DEV_LOGIN;
    assert.equal(devLoginEnabled(), true, "development keeps the demo login available");

    delete process.env.TRUST_PROXY;
    assert.equal(
      requestAddress(
        new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.5" } }),
      ),
      "local",
    );
    process.env.TRUST_PROXY = "1";
    assert.equal(
      requestAddress(
        new Request("http://localhost", {
          headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.2" },
        }),
      ),
      "203.0.113.5",
    );
    assert.equal(
      requestAddress(new Request("http://localhost", { headers: { "x-real-ip": "2001:db8::1" } })),
      "2001:db8::1",
    );
    assert.equal(
      requestAddress(
        new Request("http://localhost", { headers: { "x-forwarded-for": "not-an-ip" } }),
      ),
      "local",
    );

    const key = crypto.randomUUID();
    enforceRateLimit("test", key, 2, 60_000);
    enforceRateLimit("test", key, 2, 60_000);
    assert.throws(
      () => enforceRateLimit("test", key, 2, 60_000),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 429 &&
        error.code === "rate_limited" &&
        typeof error.details?.retryAfterSeconds === "number",
    );
  } finally {
    if (previousNodeEnv === undefined) delete (process.env as Record<string, string>).NODE_ENV;
    else (process.env as Record<string, string>).NODE_ENV = previousNodeEnv;
    if (previousDevLogin === undefined) delete process.env.ENABLE_DEV_LOGIN;
    else process.env.ENABLE_DEV_LOGIN = previousDevLogin;
    if (previousTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previousTrustProxy;
  }
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
