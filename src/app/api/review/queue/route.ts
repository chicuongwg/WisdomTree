import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listReviewQueue } from "@/modules/storage/curation";

// GET /api/review/queue?taskType&state — Admin/Op review queue
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const params = request.nextUrl.searchParams;
    const tasks = await listReviewQueue(actor, {
      taskType: params.get("taskType") ?? undefined,
      state: params.get("state") ?? undefined,
    });
    return NextResponse.json(tasks);
  });
}
