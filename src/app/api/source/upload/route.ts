import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { uploadSource } from "@/modules/storage/service";
import type { ExtractionMethod } from "@/modules/storage/extraction";

// POST /api/source/upload — multipart; store-first, returns once stored (201)
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const form = await request.formData();
    const file = form.get("file");
    const spaceId = form.get("spaceId");
    if (!(file instanceof File) || typeof spaceId !== "string") {
      throw new ApiError(400, "invalid_upload", "Vui lòng chọn tệp và kho.");
    }
    // Title defaults to the filename, extension dropped. Drive taught everyone
    // that storing a file demands no form; a mandatory title field was the
    // single biggest reason "cất tệp" felt like paperwork. originalFilename was
    // already captured and never used as a default.
    const rawTitle = form.get("title");
    const typed = typeof rawTitle === "string" ? rawTitle.trim() : "";
    const title = typed || file.name.replace(/\.[^./\\]+$/, "").trim() || file.name;
    const description = form.get("description");
    const rawMethod = form.get("extractionMethod");
    const extractionMethod: ExtractionMethod =
      typeof rawMethod === "string" && ["auto", "pandoc", "ocr"].includes(rawMethod)
        ? (rawMethod as ExtractionMethod)
        : "auto";
    const source = await uploadSource(actor, {
      spaceId,
      title,
      description:
        typeof description === "string" && description.trim() ? description.trim() : undefined,
      file,
      extractionMethod,
    });
    return NextResponse.json(source, { status: 201 });
  });
}
