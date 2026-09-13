import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { revokeAppProjectLibraryOperator, toApplicationError } from "@/modules/application";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, userId } = await params;
    await revokeAppProjectLibraryOperator(actor, { projectId, userId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
