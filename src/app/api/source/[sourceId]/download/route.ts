import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getDownloadToken } from "@/modules/storage/service";

// GET /api/source/{sourceId}/download — authorize, then 302 to a short-lived
// signed URL for exactly one object (authorization-design.md § Object Storage
// Delivery). The local-FS substitution serves it via /api/blob/{token}.
export async function GET(request: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const token = await getDownloadToken(actor, sourceId);
    return NextResponse.redirect(new URL(`/api/blob/${token}`, request.url), 302);
  });
}
