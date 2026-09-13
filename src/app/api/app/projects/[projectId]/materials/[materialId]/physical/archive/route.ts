import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { archiveAppProjectMaterialPhysical, toApplicationError } from "@/modules/application";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    return NextResponse.json({
      physical: await archiveAppProjectMaterialPhysical(actor, { projectId, materialId }),
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
