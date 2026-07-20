import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { archiveBranch } from "@/modules/knowledge/service";

// POST /api/tree/branches/{branchId}/archive — Admin/Op puts a finished
// chuyên đề away (audited). Archiving twice is a no-op in the service, so a
// second press answers 204 rather than an error the reader cannot act on.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ branchId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { branchId } = await params;
    await archiveBranch(actor, branchId);
    return new NextResponse(null, { status: 204 });
  });
}
