-- 0024 — the transactional outbox retires. Notifications are now written
-- directly inside the mutation's transaction (src/modules/notify/fanout.ts);
-- the cron tick keeps only the exactly-once deadline-reminder check
-- (deadline_reminders PK). One process, one consumer: the queue between
-- them said nothing.
DROP TABLE IF EXISTS outbox_events;
