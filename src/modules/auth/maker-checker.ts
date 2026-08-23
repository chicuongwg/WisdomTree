import { ApiError } from "@/lib/errors";

// The separation-of-duties rule of the single review boundary: whoever
// submitted a proposal never approves it. One excluded identity, on purpose —
// with a reviewer pool this small, also excluding the original author or the
// last editor could leave a proposal nobody is allowed to decide.

export function assertIndependentReviewer(
  reviewerId: string,
  review: { submittedBy: string },
): void {
  if (!isIndependentReviewer(reviewerId, review)) {
    throw new ApiError(
      403,
      "separation_of_duties",
      "The submitter cannot review their own change.",
    );
  }
}

export function isIndependentReviewer(
  reviewerId: string,
  review: { submittedBy: string },
): boolean {
  return reviewerId !== review.submittedBy;
}
