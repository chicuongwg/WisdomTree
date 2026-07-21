"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

/**
 * Extraction runs after the upload commits, so the "đang chờ xử lý" badge on a
 * freshly uploaded item is a server-rendered snapshot that never changes. The
 * page looked broken, and people reloaded to check.
 *
 * ponytail: polling, not a websocket. One request every few seconds, only
 * while the status is actually pending, only on this one screen, and it stops
 * itself after a few minutes — a socket layer for a badge that settles in
 * about eight seconds would be more moving parts than the feature.
 */
const POLL_MS = 3_000;
const GIVE_UP_MS = 5 * 60_000;

export function ExtractionWatcher({ sourceId, status }: { sourceId: string; status: string }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(status === "pending");
  // Bumped by the "kiểm tra lại" button, which restarts the effect. Giving up
  // used to be final: the sentence said the wait was longer than usual and
  // then offered nothing but a manual page reload.
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (status !== "pending") return;
    setWaiting(true);

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const deadline = Date.now() + GIVE_UP_MS;
    // A backgrounded tab asks nothing. Five minutes at three seconds is a
    // hundred requests, and nobody is looking at the badge they are for; the
    // beat picks up again when the tab is looked at, which is also the moment
    // its answer starts mattering again. (presence-row already worked this
    // way; this one did not.)
    const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";
    const onVisible = () => {
      if (!cancelled && !hidden()) {
        clearTimeout(timer);
        timer = setTimeout(poll, 0);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    async function poll() {
      if (cancelled) return;
      if (hidden()) {
        // Not a give-up: wait to be looked at, then carry on where we were.
        timer = setTimeout(poll, POLL_MS);
        return;
      }
      if (Date.now() > deadline) {
        // Stuck rather than slow: stop asking and let the reader decide.
        setWaiting(false);
        return;
      }
      try {
        const res = await fetch(`/api/source/${sourceId}`, { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { currentVersion?: { extractionStatus?: string } };
          if (body.currentVersion?.extractionStatus !== "pending") {
            if (!cancelled) router.refresh();
            return;
          }
        }
      } catch {
        // Offline or a blip: keep waiting, the next tick tries again.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    }

    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sourceId, status, router, round]);

  if (status !== "pending") return null;
  // Say the page is watching, so nobody has to guess whether to reload. Live,
  // because the whole point is that the wording changes under the reader:
  // polite, not an alert — a progress note is not worth interrupting for.
  return (
    <span className="muted" aria-live="polite">
      {waiting ? (
        T.extractionWatching
      ) : (
        <>
          {T.extractionSlow}{" "}
          <button type="button" className="secondary" onClick={() => setRound((r) => r + 1)}>
            {T.checkAgain}
          </button>
        </>
      )}
    </span>
  );
}
