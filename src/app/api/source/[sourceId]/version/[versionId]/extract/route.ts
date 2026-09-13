import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { requestExtraction } from "@/modules/storage/candidates";
import type { ExtractionMethod } from "@/modules/storage/extraction";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    const body = (await request.json()) as { method?: ExtractionMethod };
    if (!body.method || !["auto", "pandoc", "ocr"].includes(body.method)) {
      throw new ApiError(400, "invalid_method", "Extraction method must be pandoc or ocr.");
    }
    return NextResponse.json(await requestExtraction(actor, sourceId, versionId, body.method), {
      status: 202,
    });
  });
}
