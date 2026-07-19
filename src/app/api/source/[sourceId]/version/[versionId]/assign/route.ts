import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { assignCuration } from "@/modules/storage/curation";

// POST /api/source/{sourceId}/version/{versionId}/assign — Admin/Op opens
// curation as under_correction (openapi.yaml § Source Repo: curation)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    const body = (await request.json().catch(() => null)) as { assigneeId?: string } | null;
    if (!body?.assigneeId) {
      throw new ApiError(400, "invalid_assignee", "Vui lòng chọn người phụ trách.");
    }
    return NextResponse.json(await assignCuration(actor, sourceId, versionId, body.assigneeId));
  });
}
