import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getSourceDetail, renameSource, withdrawSource } from "@/modules/storage/service";

// GET /api/source/{sourceId} — 404 when outside the caller's visibility scope
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    return NextResponse.json(await getSourceDetail(actor, sourceId));
  });
}

// PATCH /api/source/{sourceId} — the submitter corrects title/description.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const body = (await request.json()) as { title?: string; description?: string | null };
    await renameSource(actor, sourceId, body);
    return NextResponse.json(await getSourceDetail(actor, sourceId));
  });
}

// DELETE /api/source/{sourceId} — withdraw, not erase: the item leaves the
// library and stops being downloadable, the bytes and audit trail remain.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    await withdrawSource(actor, sourceId);
    return new Response(null, { status: 204 });
  });
}
