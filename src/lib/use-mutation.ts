"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { T, translateApiError } from "./vi";

// The one POST-and-refresh. Thirteen components had carried a copy of it —
// same busy flag, same error parse — which is thirteen places to forget an
// aria-live, a disabled prop, or the try/catch. Every one of those copies let
// an offline fetch reject escape, and a rejected fetch never reaches the
// setBusy(false) below its await: the button stayed disabled until the reader
// reloaded the page. Anything with a genuinely different shape (upload
// progress, polling) keeps its own.

export interface Mutation {
  /** True across the whole round trip, including the refresh. */
  busy: boolean;
  /** The server's message, or the generic fallback. Null while fine. */
  error: string | null;
  /** Set on success when the caller passes one. */
  ok: string | null;
  /** Fire it. Resolves true on success so a caller can close a form after. */
  run: (path: string, opts?: MutationOpts) => Promise<boolean>;
  /**
   * The same act, for the callers that need what the server made: the id to
   * navigate to, the item code to write on a spine. Resolves null on failure,
   * so `if (!saved) return` is the whole error path.
   */
  runJson: <R>(path: string, opts?: MutationOpts) => Promise<R | null>;
  /** Clear both messages — for a form that reopens. */
  reset: () => void;
}

export interface MutationOpts {
  body?: object;
  ok?: string;
  method?: "POST" | "PATCH" | "DELETE";
  /** Called with the failed response so a caller can read `code` off it. */
  onError?: (res: Response, payload: { message?: string; code?: string } | null) => void;
}

export function useMutation(): Mutation {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // True while the refreshed server tree is still rendering — see send().
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  /** The whole round trip. Resolves the parsed success body, or null. */
  async function send<R>(
    path: string,
    opts?: MutationOpts,
  ): Promise<{ ok: boolean; data: R | null }> {
    const failed = { ok: false, data: null };
    setBusy(true);
    setError(null);
    setOk(null);
    let res: Response;
    try {
      res = await fetch(path, {
        method: opts?.method ?? "POST",
        headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      // Offline or DNS: fetch rejects rather than returning a status, and the
      // copies this replaces let that reject escape into an unhandled promise.
      setError(T.genericError);
      setBusy(false);
      return failed;
    }
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        message?: string;
        code?: string;
        details?: Record<string, unknown>;
      } | null;
      // The BE speaks English + a stable code; the translator says it in
      // Vietnamese, falling back to the server message for unknown codes.
      setError(
        payload
          ? translateApiError(payload.code, payload.details, payload.message)
          : T.genericError,
      );
      opts?.onError?.(res, payload);
      setBusy(false);
      return failed;
    }
    // A 204 and an empty body are both normal here, so the parse may find
    // nothing; that is a success with no data, not a failure.
    const data = (await res.json().catch(() => null)) as R | null;
    if (opts?.ok) setOk(opts.ok);
    // The comment that used to sit here — "refresh first, clear busy after, so
    // the button stays disabled across the round trip" — was not true of the
    // code under it. router.refresh() is not awaitable: it starts a transition
    // and returns, so setBusy(false) ran immediately and the button came back
    // to life over data the server had not sent yet. A second click there
    // fires a second POST against the state still on screen.
    //
    // startTransition gives us the flag the refresh does not: isPending stays
    // true until the new tree has actually rendered, and the caller reads it as
    // part of `busy`.
    startTransition(() => {
      router.refresh();
    });
    setBusy(false);
    return { ok: true, data };
  }

  return {
    busy: busy || refreshing,
    error,
    ok,
    run: async (path, opts) => (await send(path, opts)).ok,
    runJson: async <R>(path: string, opts?: MutationOpts) => (await send<R>(path, opts)).data,
    reset: () => {
      setError(null);
      setOk(null);
    },
  };
}
