import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { getAppProjectLibrary, toApplicationError } from "@/modules/application";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    return NextResponse.json(await getAppProjectLibrary(actor, projectId));
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
