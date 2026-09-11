import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { addAppProjectMaterialVersion, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "invalid_input", "A source file is required.");
    }
    const material = await addAppProjectMaterialVersion(actor, { projectId, materialId, file });
    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
