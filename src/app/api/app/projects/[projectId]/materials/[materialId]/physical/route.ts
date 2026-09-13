import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  addAppProjectMaterialPhysical,
  getAppProjectMaterialPhysical,
  toApplicationError,
  updateAppProjectMaterialPhysical,
} from "@/modules/application";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    return NextResponse.json({
      physical: await getAppProjectMaterialPhysical(actor, { projectId, materialId }),
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body)
      throw new ApiError(400, "invalid_physical", "Physical holding details are required.");
    const physical = await addAppProjectMaterialPhysical(actor, {
      projectId,
      sourceId: materialId,
      ...(typeof body.author === "string" ? { author: body.author } : {}),
      ...(typeof body.location === "string" ? { location: body.location } : {}),
      ...(body.copies !== undefined ? { copies: body.copies } : {}),
    });
    return NextResponse.json({ physical }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body)
      throw new ApiError(400, "invalid_physical", "Physical holding details are required.");
    const physical = await updateAppProjectMaterialPhysical(actor, {
      projectId,
      materialId,
      ...(typeof body.author === "string" ? { author: body.author } : {}),
      ...(typeof body.location === "string" ? { location: body.location } : {}),
      ...(body.copies !== undefined ? { copies: body.copies } : {}),
    });
    return NextResponse.json({ physical });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
