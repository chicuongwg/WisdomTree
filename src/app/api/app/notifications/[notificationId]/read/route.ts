import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { markAppNotificationRead, toApplicationError } from "@/modules/application";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { notificationId } = await params;
    await markAppNotificationRead(actor, notificationId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
