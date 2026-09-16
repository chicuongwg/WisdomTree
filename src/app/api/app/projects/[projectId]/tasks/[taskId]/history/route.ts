import { NextResponse, type NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { getAppTaskStatusHistory, toApplicationError } from "@/modules/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { taskId } = await params;
    const history = await getAppTaskStatusHistory(actor, taskId);
    return NextResponse.json({ history });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
