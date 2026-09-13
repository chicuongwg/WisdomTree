import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { revokeAppCoreMember, toApplicationError } from "@/modules/application";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { userId } = await params;
    return NextResponse.json({ member: await revokeAppCoreMember(actor, userId) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
