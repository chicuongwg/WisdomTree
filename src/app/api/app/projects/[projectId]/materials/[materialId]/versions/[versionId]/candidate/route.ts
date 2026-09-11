import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { getAppProjectMaterialCandidateForReview, toApplicationError } from "@/modules/application";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; materialId: string; versionId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId, versionId } = await params;
    const candidate = await getAppProjectMaterialCandidateForReview(actor, {
      projectId,
      sourceId: materialId,
      sourceVersionId: versionId,
    });
    return NextResponse.json({
      candidate: {
        sourceVersionId: candidate.sourceVersionId,
        method: candidate.method,
        contentMd: candidate.contentMd,
      },
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
