import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectExport, toApplicationError } from "@/modules/application";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    return NextResponse.json(
      { export: await createAppProjectExport(actor, projectId) },
      { status: 201 },
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
