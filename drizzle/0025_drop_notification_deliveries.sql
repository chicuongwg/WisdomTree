-- 0025 — notification_deliveries retires. With one channel (in_app) written
-- inside the mutation's own transaction, the notifications row IS delivery:
-- attempts could never exceed one, "failed" had no path to it, and the
-- email/zalo enum values referred to adapters that no longer exist. A second
-- real channel brings its own bookkeeping back.
DROP TABLE IF EXISTS notification_deliveries;
