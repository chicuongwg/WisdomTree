import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { requestRender } from "@/modules/export/service";

// POST /api/tree/nodes/{nodeId}/export — render node Markdown to docx or pdf
// (any role; worker job) → 202 JobRef (openapi.yaml). Idempotent per
// (node, format, node version).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = (await request.json().catch(() => null)) as { format?: string } | null;
    if (body?.format !== "docx" && body?.format !== "pdf") {
      throw new ApiError(400, "invalid_format", "Định dạng xuất phải là docx hoặc pdf.");
    }
    const job = await requestRender(actor, nodeId, body.format);
    return NextResponse.json(job, { status: 202 });
  });
}
