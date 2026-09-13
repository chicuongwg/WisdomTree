import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  grantAppProjectLibraryOperator,
  listAppProjectLibraryOperators,
  toApplicationError,
} from "@/modules/application";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    return NextResponse.json({ operators: await listAppProjectLibraryOperators(actor, projectId) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
    if (!body || typeof body.userId !== "string") {
      throw new ApiError(400, "invalid_operator", "A Project member is required.");
    }
    const operator = await grantAppProjectLibraryOperator(actor, {
      projectId,
      userId: body.userId,
    });
    return NextResponse.json({ operator }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
