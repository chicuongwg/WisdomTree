import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, withdrawAppProjectMaterial } from "@/modules/application";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    await withdrawAppProjectMaterial(actor, { projectId, materialId });
    return NextResponse.json({ withdrawn: true });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
