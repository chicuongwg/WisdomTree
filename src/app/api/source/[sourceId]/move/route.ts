import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { moveSource } from "@/modules/storage/service";

// POST /api/source/{sourceId}/move — file the source in a folder of its own
// space; folderId null = back to the space root
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const body = (await request.json().catch(() => ({}))) as { folderId?: string | null };
    await moveSource(actor, sourceId, body.folderId ?? null);
    return new NextResponse(null, { status: 204 });
  });
}
