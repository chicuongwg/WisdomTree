import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { evolveCandidate } from "@/modules/storage/candidates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { candidateId } = await params;
    const body = (await request.json()) as { branchId?: string; title?: string };
    if (!body.branchId) {
      throw new ApiError(400, "invalid_branch", "A personal branch is required.");
    }
    return NextResponse.json(
      await evolveCandidate(actor, candidateId, {
        branchId: body.branchId,
        title: body.title,
      }),
      { status: 201 },
    );
  });
}
