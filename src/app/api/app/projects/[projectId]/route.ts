import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, updateAppProject } from "@/modules/application";

const STATUSES = ["active", "paused", "completed", "archived"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.expectedVersion !== "number") {
      throw new ApiError(400, "invalid_project", "Expected version is required.");
    }
    if (
      (body.researchLens !== undefined && typeof body.researchLens !== "string") ||
      (body.description !== undefined &&
        body.description !== null &&
        typeof body.description !== "string") ||
      (body.status !== undefined && !STATUSES.includes(body.status as (typeof STATUSES)[number]))
    ) {
      throw new ApiError(400, "invalid_project", "Invalid Project update.");
    }
    const project = await updateAppProject(actor, projectId, {
      expectedVersion: body.expectedVersion,
      ...(typeof body.researchLens === "string" ? { researchLens: body.researchLens } : {}),
      ...(body.description === null || typeof body.description === "string"
        ? { description: body.description }
        : {}),
      ...(body.status ? { status: body.status as (typeof STATUSES)[number] } : {}),
    });
    return NextResponse.json({ project });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
