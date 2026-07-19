import { verificationLabel } from "@/lib/vi";

/**
 * Trust-state badge (Node Detail spec: "page header with verification
 * badge"). Color + text together — never color alone — per the a11y floor.
 */
export function VerificationBadge({ verification }: { verification: string }) {
  return <span className={`badge ${verification}`}>{verificationLabel[verification] ?? verification}</span>;
}
