import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { uploadSource } from "@/modules/storage/service";

// POST /api/source/upload — multipart; store-first, returns once stored (201)
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const form = await request.formData();
    const file = form.get("file");
    const spaceId = form.get("spaceId");
    const title = form.get("title");
    if (!(file instanceof File) || typeof spaceId !== "string" || typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "invalid_upload", "Vui lòng chọn tệp, kho và nhập tiêu đề.");
    }
    const description = form.get("description");
    const source = await uploadSource(actor, {
      spaceId,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : undefined,
      file,
    });
    return NextResponse.json(source, { status: 201 });
  });
}
