import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { nominateSource, revertNomination } from "@/modules/storage/curation";

// POST /api/source/{sourceId}/nominate — the uploader opens curation on their
// own stored file (unassigned); 409 if already nominated or not stored.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    return NextResponse.json(await nominateSource(actor, sourceId), { status: 201 });
  });
}

// DELETE /api/source/{sourceId}/nominate — the uploader withdraws their
// nomination before it is promoted to the tree; 409 if already promoted.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    return NextResponse.json(await revertNomination(actor, sourceId));
  });
}
