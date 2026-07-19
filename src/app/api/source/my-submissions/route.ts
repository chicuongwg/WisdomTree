import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { mySubmissions } from "@/modules/storage/service";

// GET /api/source/my-submissions — unified intake history (intake_items view)
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await mySubmissions(actor));
  });
}
