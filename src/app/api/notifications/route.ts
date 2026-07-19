import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listNotifications } from "@/modules/notify/service";

// GET /api/notifications?unreadOnly= — the caller's in-app center.
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
    return NextResponse.json(await listNotifications(actor, unreadOnly));
  });
}
