import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { triggerTreeExport } from "@/modules/export/service";

// POST /api/export/tree — trigger the one-way tree export to the content repo
// (Admin/Op; idempotent no-change handling in the target) → 202 JobRef.
export async function POST() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const job = await triggerTreeExport(actor);
    return NextResponse.json(job, { status: 202 });
  });
}
