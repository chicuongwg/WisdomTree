import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { T } from "@/lib/vi";
import { requirePrincipal } from "@/lib/request";
import { listAuditEvents } from "@/modules/auth/admin";

// GET /api/admin/audit?before=<iso>&limit=<n> — keyset page of the audit
// trail, newest first. bigint ids and Dates cross the wire as strings.
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const beforeRaw = request.nextUrl.searchParams.get("before");
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const before = beforeRaw ? new Date(beforeRaw) : undefined;
    if (before && Number.isNaN(before.getTime())) {
      throw new ApiError(400, "invalid_cursor", T.invalidTimeCursor);
    }
    const rows = await listAuditEvents(actor, {
      before,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });
    return NextResponse.json(
      rows.map((r) => ({ ...r, id: String(r.id), createdAt: r.createdAt.toISOString() })),
    );
  });
}
