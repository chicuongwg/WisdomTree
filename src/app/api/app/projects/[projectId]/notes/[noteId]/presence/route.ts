import { NextResponse, type NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/request";
import {
  clearAppCollaborationPresence,
  listAppCollaborationPresence,
  markAppCollaborationPresence,
  toApplicationError,
} from "@/modules/application";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    return NextResponse.json(
      await markAppCollaborationPresence(actor, { kind: "note", projectId, entityId: noteId }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    return NextResponse.json(
      await listAppCollaborationPresence(actor, { kind: "note", projectId, entityId: noteId }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    await clearAppCollaborationPresence(actor, { kind: "note", projectId, entityId: noteId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
