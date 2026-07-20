"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "./vi";

// The one POST-and-refresh. Five components had carried a byte-identical copy
// of it — same busy flag, same error parse, same trailing comment — which is
// five places to forget an aria-live or a disabled prop. Anything with a
// different shape (upload progress, polling, optimistic edits) keeps its own.

export interface Mutation {
  /** True across the whole round trip, including the refresh. */
  busy: boolean;
  /** The server's message, or the generic fallback. Null while fine. */
  error: string | null;
  /** Set on success when the caller passes one. */
  ok: string | null;
  /** Fire it. Resolves true on success so a caller can close a form after. */
  run: (path: string, opts?: { body?: object; ok?: string }) => Promise<boolean>;
  /** Clear both messages — for a form that reopens. */
  reset: () => void;
}

export function useMutation(): Mutation {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function run(path: string, opts?: { body?: object; ok?: string }): Promise<boolean> {
    setBusy(true);
    setError(null);
    setOk(null);
    let res: Response;
    try {
      res = await fetch(path, {
        method: "POST",
        headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      // Offline or DNS: fetch rejects rather than returning a status, and the
      // copies this replaces let that reject escape into an unhandled promise.
      setError(T.genericError);
      setBusy(false);
      return false;
    }
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? T.genericError);
      setBusy(false);
      return false;
    }
    if (opts?.ok) setOk(opts.ok);
    // Refresh first, clear busy after: the button stays disabled across the
    // round trip so the act cannot be fired twice.
    router.refresh();
    setBusy(false);
    return true;
  }

  return { busy, error, ok, run, reset: () => { setError(null); setOk(null); } };
}
