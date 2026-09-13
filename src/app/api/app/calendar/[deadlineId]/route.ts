import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, updateAppDeadline } from "@/modules/application";

const TYPES = ["conference", "funding", "report", "milestone"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { deadlineId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.expectedVersion !== "number" ||
      typeof body.title !== "string" ||
      typeof body.dueAt !== "string" ||
      !TYPES.includes(body.type as (typeof TYPES)[number])
    ) {
      throw new ApiError(
        400,
        "invalid_deadline",
        "A current deadline version and valid fields are required.",
      );
    }
    const deadline = await updateAppDeadline(actor, deadlineId, {
      title: body.title,
      type: body.type as (typeof TYPES)[number],
      dueAt: body.dueAt,
      expectedVersion: body.expectedVersion,
    });
    return NextResponse.json({ deadline });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
