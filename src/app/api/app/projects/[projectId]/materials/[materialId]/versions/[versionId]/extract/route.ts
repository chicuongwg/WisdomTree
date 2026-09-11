import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { requestAppProjectMaterialExtraction, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string; versionId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId, versionId } = await params;
    const body = (await request.json().catch(() => ({}))) as { method?: unknown };
    const method = body.method === "ocr" || body.method === "pandoc" ? body.method : "auto";
    if (body.method !== undefined && method === "auto" && body.method !== "auto") {
      throw new ApiError(400, "invalid_input", "Extraction method is invalid.");
    }
    const extraction = await requestAppProjectMaterialExtraction(actor, {
      projectId,
      materialId,
      sourceVersionId: versionId,
      method,
    });
    return NextResponse.json({ extraction }, { status: 202 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
