import { ApiError } from "@/lib/errors";

export function assertIndependentReviewer(
  reviewerId: string,
  review: { originatorId: string; lastEditorId: string; submittedBy: string },
): void {
  if ([review.originatorId, review.lastEditorId, review.submittedBy].includes(reviewerId)) {
    throw new ApiError(403, "separation_of_duties", "Người tạo hoặc sửa không được tự duyệt.");
  }
}
