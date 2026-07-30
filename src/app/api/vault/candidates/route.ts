import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listPersonalCandidates } from "@/modules/storage/candidates";

export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await listPersonalCandidates(actor));
  });
}
