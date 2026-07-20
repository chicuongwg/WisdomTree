import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createGapRequest } from "@/modules/storage/curation";

// POST /api/source/gap-request — the no-file intake mode: request something the
// collection is missing. Triage lives under [requestId]/.
export async function POST(request: Request) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json()) as { title?: string; description?: string };
    return NextResponse.json(await createGapRequest(actor, body), { status: 201 });
  });
}
