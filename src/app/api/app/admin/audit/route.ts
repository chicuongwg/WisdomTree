import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { listAppAuditEvents, toApplicationError } from "@/modules/application";

export async function GET() {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json({ events: await listAppAuditEvents(actor, { limit: 12 }) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
