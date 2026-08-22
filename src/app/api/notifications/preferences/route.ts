import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getPreferences, updatePreferences } from "@/modules/notify/service";

// GET /api/notifications/preferences — per-event channels, defaults merged in.
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await getPreferences(actor));
  });
}

// PATCH /api/notifications/preferences — body is the contract array of
// { eventType, enabled }; absent event types keep their current value.
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as Array<{
      eventType?: string;
      enabled?: boolean;
    }> | null;
    if (!Array.isArray(body) || body.some((p) => !p?.eventType || typeof p.enabled !== "boolean")) {
      throw new ApiError(400, "invalid_preferences", "Invalid notification preferences payload.");
    }
    const prefs = await updatePreferences(
      actor,
      body.map((p) => ({ eventType: p.eventType!, enabled: p.enabled! })),
    );
    return NextResponse.json(prefs);
  });
}
