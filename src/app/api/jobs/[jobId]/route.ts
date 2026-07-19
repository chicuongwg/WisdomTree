import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getJob } from "@/modules/export/service";

// GET /api/jobs/{jobId} — job status as JobRef (+ artifact download link and
// converter warnings once a render job succeeds). Dev addition: openapi.yaml
// defines the JobRef schema but no status path; the Node Detail poll needs
// one. Flagged in the build report.
export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { jobId } = await params;
    return NextResponse.json(await getJob(actor, jobId));
  });
}
