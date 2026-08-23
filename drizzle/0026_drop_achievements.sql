-- 0026 — achievements retires: a complete backend (table, service, API
-- route) that no pixel of UI ever called. Gamification is not one of the
-- product's pillars; if it ever becomes one, it starts from a design, not
-- from an empty table. The two audit-label keys stay in the translator so
-- historical audit rows still render.
DROP TABLE IF EXISTS achievements;
