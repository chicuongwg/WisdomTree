import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { T } from "@/lib/vi";
import { requirePrincipal } from "@/lib/request";
import { addSourceVersion } from "@/modules/storage/service";

// POST /api/source/{sourceId}/version — multipart; a corrected copy of the
// same document becomes the current version (201)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "invalid_upload", T.fileRequired);
    }
    const source = await addSourceVersion(actor, sourceId, file);
    return NextResponse.json(source, { status: 201 });
  });
}
