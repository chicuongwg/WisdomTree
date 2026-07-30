import assert from "node:assert/strict";
import { GET as health } from "@/app/api/health/route";
import { POST as dispatch } from "@/app/api/cron/dispatch/route";

export const run = async () => {
  const healthResponse = await health();
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: "ok" });

  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    const unavailable = await dispatch(
      new Request("http://localhost/api/cron/dispatch", { method: "POST" }),
    );
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { ok: false, error: "cron_unavailable" });

    process.env.CRON_SECRET = "integration-cron-secret";
    const missing = await dispatch(
      new Request("http://localhost/api/cron/dispatch", { method: "POST" }),
    );
    assert.equal(missing.status, 401);
    assert.deepEqual(await missing.json(), { ok: false, error: "unauthorized" });

    const wrong = await dispatch(
      new Request("http://localhost/api/cron/dispatch", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    assert.equal(wrong.status, 401);
    assert.deepEqual(await wrong.json(), { ok: false, error: "unauthorized" });

    const accepted = await dispatch(
      new Request("http://localhost/api/cron/dispatch", {
        method: "POST",
        headers: { authorization: "Bearer integration-cron-secret" },
      }),
    );
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { ok: true });
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
