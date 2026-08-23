import type { Tx } from "@/db";
import { auditEvents } from "./schema";
import type { Principal } from "../auth/principal";

// Every mutation writes audit_events in the SAME transaction as the mutation.
// Services call this helper inside their tx.

export type Accountability =
  "uploader" | "editor_updater" | "approver_publisher" | "operator" | "member"; // baseline member actions (loan requests, comments) — gate-2 ruling

export async function recordAudit(
  tx: Tx,
  actor: Principal,
  entry: {
    accountability: Accountability;
    action: string; // e.g. source.upload, loan.approve — dotted module.action
    targetType: string;
    targetId: string;
    outcome?: "success" | "denied" | "failed";
    details?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(auditEvents).values({
    actorId: actor.userId,
    actorRole: actor.role, // role at action time, denormalized on purpose
    accountability: entry.accountability,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    outcome: entry.outcome ?? "success",
    details: entry.details ?? null,
  });
}
