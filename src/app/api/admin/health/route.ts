import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { healthReport } from "@/modules/export/service";

// GET /api/admin/health — system health for Admin/Op: job counts by state,
// overdue loans, last export, backup placeholder.
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await healthReport(actor));
  });
}
