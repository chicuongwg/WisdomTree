-- Batch K: who is on this page right now.
--
-- Two people editing the same knowledge page overwrite each other. The version
-- check catches it AFTER the fact — the loser is told to reload and retypes
-- their paragraph. This table is the warning BEFORE the fact: open a page and
-- you see who else has it open.
--
-- One row per (person, page), rewritten on every heartbeat. Not an event log:
-- nobody needs the history of who looked at what, and keeping it would build a
-- surveillance record of a colleague's reading habits. Deliberately never
-- anonymous (owner decision 2026-07-21) — a warning that says "someone" is
-- editing this is a warning you cannot act on.
CREATE TABLE presence (
  user_id   uuid NOT NULL REFERENCES users(id),
  page_key  text NOT NULL,
  seen_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, page_key)
);

-- The only read: everyone currently on one page, newest first.
CREATE INDEX presence_page ON presence (page_key, seen_at DESC);
