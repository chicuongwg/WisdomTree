import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppDeadline, toApplicationError } from "@/modules/application";

const TYPES = ["conference", "funding", "report", "milestone"] as const;

export async function POST(request: NextRequest) {
  try {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.spaceId !== "string" ||
      typeof body.title !== "string" ||
      typeof body.dueAt !== "string" ||
      !TYPES.includes(body.type as (typeof TYPES)[number])
    ) {
      throw new ApiError(
        400,
        "invalid_deadline",
        "Valid Project, title, type and due date are required.",
      );
    }
    const deadline = await createAppDeadline(actor, {
      spaceId: body.spaceId,
      title: body.title,
      type: body.type as (typeof TYPES)[number],
      dueAt: body.dueAt,
    });
    return NextResponse.json({ deadline }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
