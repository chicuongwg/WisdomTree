import { badgeClass, verificationLabel, verificationStateLabel } from "@/lib/vi";

/**
 * Trust-state badge (Node Detail spec: "page header with verification
 * badge"). Colour + text together — never colour alone — per the a11y floor.
 * The tone comes from the shared state→tone table, so an unknown verification
 * degrades to the neutral chip instead of emitting a bogus class name.
 */
export function VerificationBadge({ verification }: { verification: string }) {
  return (
    <span className={badgeClass(verificationLabel, verification)}>
      {verificationStateLabel(verification)}
    </span>
  );
}
