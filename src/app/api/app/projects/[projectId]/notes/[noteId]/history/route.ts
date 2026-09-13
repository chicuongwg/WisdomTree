import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { listAppProjectNoteHistory, toApplicationError } from "@/modules/application";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    return NextResponse.json({
      versions: await listAppProjectNoteHistory(actor, { projectId, noteId }),
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
