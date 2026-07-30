"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query, answered correctly on the FIRST client render.
 *
 * The old shape — useState(false) plus an effect that corrected it — meant a
 * reader who asks for reduced motion still got one tick of `false`: the
 * simulation was built, ticked, painted, and then thrown away and re-seeded
 * when the effect ran. That is precisely the jump reduced-motion exists to
 * prevent, delivered by the code meant to honour it. The touch help paragraph
 * and the reduced-motion notice flipped a tick after mount for the same
 * reason, shoving the canvas down.
 *
 * useSyncExternalStore has a server snapshot (false, because the server has no
 * viewport) and a client snapshot read synchronously — so hydration matches the
 * HTML and the very first client render already knows the answer.
 */
export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
