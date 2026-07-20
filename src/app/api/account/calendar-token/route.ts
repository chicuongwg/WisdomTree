import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { regenerateCalendarToken } from "@/modules/pm/service";

// POST /api/account/calendar-token — revoke the caller's active calendar
// tokens and mint a fresh one, in one transaction. The URL uses the same
// shape the /account page displays: {proto}://{host}/calendar/{token}.ics.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const token = await regenerateCalendarToken(actor);
    const host = request.headers.get("host") ?? "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    return NextResponse.json({ token, url: `${proto}://${host}/calendar/${token}.ics` });
  });
}
