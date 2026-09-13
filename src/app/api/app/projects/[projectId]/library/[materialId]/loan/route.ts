import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { requestAppProjectLibraryLoan, toApplicationError } from "@/modules/application";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    return NextResponse.json(await requestAppProjectLibraryLoan(actor, { projectId, materialId }), {
      status: 201,
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
