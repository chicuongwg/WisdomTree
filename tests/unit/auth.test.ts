import assert from "node:assert";
import { enforceRateLimit, enforceUserRateLimit, requestAddress } from "@/lib/rate-limit";
import { ApiError } from "@/lib/errors";
import { isIndependentReviewer } from "@/modules/auth/maker-checker";

export const run = async () => {
  const reviewerId = "reviewer";
  assert.equal(
    isIndependentReviewer(reviewerId, {
      originatorId: "author",
      lastEditorId: "editor",
      submittedBy: "submitter",
    }),
    true,
  );
  assert.equal(
    isIndependentReviewer(reviewerId, {
      originatorId: "author",
      lastEditorId: reviewerId,
      submittedBy: "submitter",
    }),
    false,
  );

  const previousTrustProxy = process.env.TRUST_PROXY;
  try {
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

    // The account-wide cap (USER_RATE_LIMIT, default 240/min): well under the
    // limit it must be silent — it runs on every request of every signed-in
    // user, so a false 429 here would be an outage.
    const userId = crypto.randomUUID();
    for (let i = 0; i < 10; i++) enforceUserRateLimit(userId);
  } finally {
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
