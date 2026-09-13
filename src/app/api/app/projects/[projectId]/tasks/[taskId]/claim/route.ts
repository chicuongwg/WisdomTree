import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { claimAppProjectTask, toApplicationError } from "@/modules/application";

/** Claim only an unassigned Task in this exact target Project. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, taskId } = await params;
    return NextResponse.json({ task: await claimAppProjectTask(actor, projectId, taskId) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
