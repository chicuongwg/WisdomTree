import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { grantAppCoreMember, listAppCoreMembers, toApplicationError } from "@/modules/application";

export async function GET() {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json({ members: await listAppCoreMembers(actor) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
    if (!body || typeof body.userId !== "string") {
      throw new ApiError(400, "invalid_core_member", "A user is required.");
    }
    return NextResponse.json(
      { member: await grantAppCoreMember(actor, body.userId) },
      { status: 201 },
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
