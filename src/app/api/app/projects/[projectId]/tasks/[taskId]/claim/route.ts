import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    const task = await claimAppProjectTask(actor, projectId, taskId);
    revalidatePath("/app");
    revalidatePath("/app/my-work");
    revalidatePath("/app/calendar");
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/tasks`);
    revalidatePath(`/app/projects/${projectId}/tasks/${taskId}`);
    return NextResponse.json({ task });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
