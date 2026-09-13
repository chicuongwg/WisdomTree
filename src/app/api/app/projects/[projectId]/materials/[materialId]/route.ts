import { NextResponse, type NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, updateAppProjectMaterial } from "@/modules/application";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    const body = (await request.json()) as { title?: unknown; description?: unknown };
    const material = await updateAppProjectMaterial(actor, {
      projectId,
      materialId,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.description === "string" || body.description === null
        ? { description: body.description }
        : {}),
    });
    return NextResponse.json({ material });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
