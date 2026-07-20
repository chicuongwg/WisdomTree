import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { restoreSource } from "@/modules/storage/service";

// POST /api/source/{sourceId}/restore — Admin/Op: archived → stored, the way
// back the withdraw dialog promises
export async function POST(_request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    await restoreSource(actor, sourceId);
    return new NextResponse(null, { status: 204 });
  });
}
