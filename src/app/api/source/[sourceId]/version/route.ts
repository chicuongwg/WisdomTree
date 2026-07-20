import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { addSourceVersion } from "@/modules/storage/service";

// POST /api/source/{sourceId}/version — multipart; a corrected copy of the
// same document becomes the current version (201)
export async function POST(request: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      // TODO(vi): move to src/lib/vi.ts
      throw new ApiError(400, "invalid_upload", "Vui lòng chọn tệp.");
    }
    const source = await addSourceVersion(actor, sourceId, file);
    return NextResponse.json(source, { status: 201 });
  });
}
