import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listMemberSpaces } from "@/modules/storage/service";

// GET /api/spaces — members see own spaces; Admin/Op sees all
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await listMemberSpaces(actor));
  });
}
