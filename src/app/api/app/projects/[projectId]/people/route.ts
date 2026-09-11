import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectPerson, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as {
      displayName?: unknown;
      summary?: unknown;
    } | null;
    if (!body || typeof body.displayName !== "string") {
      throw new ApiError(400, "invalid_input", "Person name is required.");
    }
    const person = await createAppProjectPerson(actor, {
      projectId,
      displayName: body.displayName,
      summary: typeof body.summary === "string" ? body.summary : null,
    });
    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
