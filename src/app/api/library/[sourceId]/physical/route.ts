import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { updatePhysicalItem } from "@/modules/storage/physical";

// PATCH /api/library/{sourceId}/physical — Admin/Op edits the shelf facts
// (copies guarded against the number currently out; author; location).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const body = (await request.json()) as {
      copies?: unknown;
      author?: string;
      location?: string;
    };
    return NextResponse.json(await updatePhysicalItem(actor, sourceId, body));
  });
}
