import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  addAppActivityMaterial,
  addAppActivityNote,
  addAppActivityParticipant,
  getAppActivity,
  removeAppActivityMaterial,
  removeAppActivityNote,
  removeAppActivityParticipant,
  toApplicationError,
} from "@/modules/application";

type ContextKind = "participant" | "material" | "note";

async function requireInProject(
  actor: Awaited<ReturnType<typeof requirePrincipal>>,
  projectId: string,
  activityId: string,
) {
  const activity = await getAppActivity(actor, activityId);
  if (activity.projectId !== projectId) throw new ApiError(404, "not_found", "Activity not found.");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; activityId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, activityId } = await params;
    const body = (await request.json().catch(() => null)) as {
      kind?: unknown;
      id?: unknown;
      roleLabel?: unknown;
    } | null;
    if (
      !body ||
      typeof body.id !== "string" ||
      !["participant", "material", "note"].includes(body.kind as string)
    ) {
      throw new ApiError(400, "invalid_input", "Valid Activity context is required.");
    }
    await requireInProject(actor, projectId, activityId);
    const kind = body.kind as ContextKind;
    const result =
      kind === "participant"
        ? await addAppActivityParticipant(actor, {
            activityId,
            personId: body.id,
            roleLabel: typeof body.roleLabel === "string" ? body.roleLabel : null,
          })
        : kind === "material"
          ? await addAppActivityMaterial(actor, { activityId, sourceId: body.id })
          : await addAppActivityNote(actor, { activityId, nodeId: body.id });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; activityId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, activityId } = await params;
    const kind = request.nextUrl.searchParams.get("kind") as ContextKind | null;
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !kind || !["participant", "material", "note"].includes(kind)) {
      throw new ApiError(400, "invalid_input", "Valid Activity context is required.");
    }
    await requireInProject(actor, projectId, activityId);
    const result =
      kind === "participant"
        ? await removeAppActivityParticipant(actor, { activityId, personId: id })
        : kind === "material"
          ? await removeAppActivityMaterial(actor, { activityId, sourceId: id })
          : await removeAppActivityNote(actor, { activityId, nodeId: id });
    return NextResponse.json({ result });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
