import { ApiError } from "@/lib/errors";

// The separation-of-duties rule of the single review boundary: whoever wrote
// or submitted a proposal never approves it.

export function assertIndependentReviewer(
  reviewerId: string,
  review: { originatorId: string; lastEditorId: string; submittedBy: string },
): void {
  if (!isIndependentReviewer(reviewerId, review)) {
    throw new ApiError(403, "separation_of_duties", "The author or submitter cannot review their own change.");
  }
}

export function isIndependentReviewer(
  reviewerId: string,
  review: { originatorId: string; lastEditorId: string; submittedBy: string },
): boolean {
  return ![review.originatorId, review.lastEditorId, review.submittedBy].includes(reviewerId);
}
