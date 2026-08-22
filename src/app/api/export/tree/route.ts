import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { triggerTreeExport } from "@/modules/export/service";

// POST /api/export/tree — run the one-way tree export to the content repo
// (Admin/Op; idempotent no-change handling in the target). Synchronous: the
// target is a local bare repo, so the caller gets the commit result directly.
export async function POST() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const result = await triggerTreeExport(actor);
    return NextResponse.json(result);
  });
}
