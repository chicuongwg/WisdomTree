import type { Mutation } from "@/lib/use-mutation";

// What the app says back after an act. Three things were wrong before: most of
// these messages were never announced to a screen reader, several successes
// were painted in .error-text (the colour reserved for failure), and one was
// .muted, indistinguishable from a timestamp. One element decides all three.
//
// role="alert" interrupts; role="status" waits for a pause. A failed save is
// worth interrupting for, a saved one is not.

export function Say({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) {
    return (
      <p className="error-text" role="alert">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p className="success-text" role="status">
        {ok}
      </p>
    );
  }
  // The region has to be in the DOM before the message arrives, or assistive
  // tech announces nothing: an element that appears already-populated is not a
  // change. This is the empty placeholder that makes the two branches above
  // work at all.
  return <p role="status" aria-live="polite" className="sr-only" />;
}

/** The same thing, fed straight from useMutation(). */
export const SayMutation = ({ m }: { m: Pick<Mutation, "error" | "ok"> }) => (
  <Say error={m.error} ok={m.ok} />
);
