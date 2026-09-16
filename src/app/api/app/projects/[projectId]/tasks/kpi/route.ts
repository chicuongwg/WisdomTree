import { NextResponse, type NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { getAppProjectTaskKpis, toApplicationError } from "@/modules/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const kpis = await getAppProjectTaskKpis(actor, projectId);
    return NextResponse.json(kpis);
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
