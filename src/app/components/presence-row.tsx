"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/vi";

/**
 * Who else has this page open, by name.
 *
 * The version check already refuses a save built on stale content, but it
 * refuses it after the paragraph has been typed. This is the warning before
 * that: you open a page, you see that Lê Văn Minh has it open too, and you go
 * and talk to them. Never anonymous by owner decision — "một người khác" is a
 * warning nobody can act on.
 *
 * ponytail: polling on a fixed beat, no socket. The list is allowed to be a
 * few seconds stale; a realtime channel for a row of names would be a whole
 * transport to maintain for a warning light. Upgrade path if the team ever
 * wants live cursors, which is a different feature.
 */

/**
 * PRESENCE_TTL_MS in the notify service is 90s and is documented as two missed
 * heartbeats, which fixes this at 45s. Not repeated as an import on purpose:
 * that module pulls in the database driver, and this is client code.
 */
const BEAT_MS = 45_000;

type Person = { userId: string; displayName: string };

/** Same shape as the rail's avatar: the last word of the name, two letters. */
function initials(name: string): string {
  return (name.split(/\s+/).filter(Boolean).slice(-1)[0] ?? "?").slice(0, 2).toUpperCase();
}

export function PresenceRow({ pageKey }: { pageKey: string }) {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const url = `/api/presence?page=${encodeURIComponent(pageKey)}`;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function beat() {
      try {
        const res = await fetch(url, { method: "POST", cache: "no-store" });
        if (!stopped && res.ok) setPeople((await res.json()) as Person[]);
      } catch {
        // Offline, or the request lost a navigation race. The page this
        // decorates must keep working, so a failed heartbeat is simply the
        // next heartbeat's problem.
      }
    }

    function leave() {
      // keepalive, because the tab may be gone before the response arrives.
      fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
    }

    // The heartbeat runs only while the tab is actually on screen. A page left
    // open overnight in a background tab is not someone you could go and talk
    // to, and it must not keep writing to the database until morning: going
    // hidden clears the row and stops the timer, coming back re-marks it.
    function sync() {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === "visible") {
        void beat();
        timer = setInterval(beat, BEAT_MS);
      } else {
        // The row is left standing. Clearing it here removed a whole line from
        // the page every time the reader switched tabs and put it back one
        // request after they returned, so the content under it jumped twice
        // for a warning whose whole job is to be quiet. Our own row is still
        // withdrawn from the database — what other people see is honest; what
        // this reader sees is at most a few seconds stale, and only while they
        // are not looking at it.
        leave();
      }
    }

    sync();
    document.addEventListener("visibilitychange", sync);
    // pagehide fires where beforeunload does not (bfcache, mobile Safari).
    // It is still not guaranteed, which is why listPresence filters on age.
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [pageKey]);

  // Nothing to warn about, and nothing at all without JavaScript: the row is
  // an extra, never a thing the page needs in order to render.
  if (people.length === 0) return null;

  return (
    <p className="presence-row" aria-live="polite">
      <span className="presence-label">{T.presenceHere}</span>
      {people.map((p) => (
        // The name is written out, not hidden behind a hover. Initials alone
        // with a title attribute would leave a keyboard reader with two
        // letters and no way to find out whose they are.
        <span key={p.userId} className="presence-who">
          <span className="presence-disc" aria-hidden="true">
            {initials(p.displayName)}
          </span>
          {p.displayName}
        </span>
      ))}
    </p>
  );
}
