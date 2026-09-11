import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, updateAppPerson } from "@/modules/application";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { personId } = await params;
    const body = (await request.json().catch(() => null)) as {
      displayName?: unknown;
      summary?: unknown;
      expectedVersion?: unknown;
    } | null;
    if (!body || typeof body.expectedVersion !== "number") {
      throw new ApiError(400, "invalid_input", "Person version is required.");
    }
    const person = await updateAppPerson(actor, {
      personId,
      ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}),
      ...(typeof body.summary === "string" || body.summary === null
        ? { summary: body.summary as string | null }
        : {}),
      expectedVersion: body.expectedVersion,
    });
    return NextResponse.json({ person });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
