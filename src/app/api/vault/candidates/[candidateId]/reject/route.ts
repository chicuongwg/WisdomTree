import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { rejectCandidate } from "@/modules/storage/candidates";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { candidateId } = await params;
    return NextResponse.json(await rejectCandidate(actor, candidateId));
  });
}
