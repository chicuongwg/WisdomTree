import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { updateDeadline } from "@/modules/pm/service";

// PATCH /api/deadlines/:deadlineId — edit (project members; expectedVersion).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { deadlineId } = await params;
    const body = (await request.json().catch(() => null)) ?? {};
    return NextResponse.json(await updateDeadline(actor, deadlineId, body));
  });
}
