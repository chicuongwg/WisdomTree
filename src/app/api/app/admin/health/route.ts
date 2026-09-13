import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/request";
import { getAppOperationalStatus, toApplicationError } from "@/modules/application";

export async function GET() {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json({ status: await getAppOperationalStatus(actor) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
