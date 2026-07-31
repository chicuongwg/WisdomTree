import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "./dev-auth";

export function assertIndependentReviewer(
  reviewerId: string,
  review: { originatorId: string; lastEditorId: string; submittedBy: string },
): void {
  if (!isIndependentReviewer(reviewerId, review)) {
    throw new ApiError(403, "separation_of_duties", "Người tạo hoặc sửa không được tự duyệt.");
  }
}

export function isIndependentReviewer(
  reviewerId: string,
  review: { originatorId: string; lastEditorId: string; submittedBy: string },
): boolean {
  return ![review.originatorId, review.lastEditorId, review.submittedBy].includes(reviewerId);
}

export function canReviewVault(actor: Principal, vaultId: string): boolean {
  const grant = actor.vaultGrants?.find((item) => item.vaultId === vaultId)?.grant;
  return grant === "reviewer" || grant === "owner";
}

export function assertReviewScope(
  actor: Principal,
  input: {
    vaultId: string;
    assignedTo?: string | null;
    review: { originatorId: string; lastEditorId: string; submittedBy: string };
  },
): void {
  if (input.assignedTo !== actor.userId && !canReviewVault(actor, input.vaultId)) {
    throw notFound();
  }
  assertIndependentReviewer(actor.userId, input.review);
}
