import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { markNotificationRead } from "@/modules/notify/service";

// POST /api/notifications/:notificationId/read — 204; someone else's → 404.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { notificationId } = await params;
    await markNotificationRead(actor, notificationId);
    return new Response(null, { status: 204 });
  });
}
