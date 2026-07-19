import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listBoard } from "@/modules/pm/service";

// GET /api/board — operational board tasks (Editor, Admin/Op).
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await listBoard(actor));
  });
}
