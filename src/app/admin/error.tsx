"use client";

import { T } from "@/lib/vi";

export default function AdminError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <h1>{T.errorTitle}</h1>
      <p>{T.errorDescription}</p>
      <button onClick={reset} className="btn">
        {T.retry}
      </button>
    </main>
  );
}
