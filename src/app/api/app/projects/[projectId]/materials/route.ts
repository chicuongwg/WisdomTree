import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectMaterial, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const form = await request.formData();
    const title = form.get("title");
    const description = form.get("description");
    const uploaded = form.get("file");
    if (typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "invalid_input", "Material title is required.");
    }
    const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : undefined;
    const material = await createAppProjectMaterial(actor, {
      projectId,
      title,
      description: typeof description === "string" ? description : null,
      file,
    });
    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
