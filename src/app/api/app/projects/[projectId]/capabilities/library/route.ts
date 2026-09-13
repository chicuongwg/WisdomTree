import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  disableAppProjectCapability,
  enableAppProjectCapability,
  toApplicationError,
} from "@/modules/application";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
    if (!body || typeof body.enabled !== "boolean") {
      throw new ApiError(400, "invalid_capability", "Library capability state is required.");
    }
    const result = body.enabled
      ? await enableAppProjectCapability(actor, { projectId, capability: "library_circulation" })
      : await disableAppProjectCapability(actor, { projectId, capability: "library_circulation" });
    return NextResponse.json(result);
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
