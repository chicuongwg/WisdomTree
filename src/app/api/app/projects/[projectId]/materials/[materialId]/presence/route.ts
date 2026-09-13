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
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    return NextResponse.json(
      await markAppCollaborationPresence(actor, {
        kind: "material",
        projectId,
        entityId: materialId,
      }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    return NextResponse.json(
      await listAppCollaborationPresence(actor, {
        kind: "material",
        projectId,
        entityId: materialId,
      }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    await clearAppCollaborationPresence(actor, {
      kind: "material",
      projectId,
      entityId: materialId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
