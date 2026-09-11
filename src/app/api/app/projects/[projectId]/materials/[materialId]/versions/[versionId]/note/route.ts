import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  evolveAppProjectMaterialCandidateIntoNote,
  toApplicationError,
} from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string; versionId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId, versionId } = await params;
    const body = (await request.json().catch(() => ({}))) as { title?: unknown };
    if (body.title !== undefined && typeof body.title !== "string") {
      throw new ApiError(400, "invalid_input", "Note title is invalid.");
    }
    const result = await evolveAppProjectMaterialCandidateIntoNote(actor, {
      projectId,
      materialId,
      sourceVersionId: versionId,
      title: typeof body.title === "string" ? body.title : undefined,
    });
    return NextResponse.json({ draft: result.draft }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
