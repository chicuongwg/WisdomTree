import type { NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getDownloadToken } from "@/modules/storage/service";

// GET /api/source/{sourceId}/download — authorize, then 302 to a short-lived
// signed URL for exactly one object (authorization-design.md § Object Storage
// Delivery). The local-FS substitution serves it via /api/blob/{token}.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ sourceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const token = await getDownloadToken(actor, sourceId);
    // Relative Location, not new URL(..., request.url): behind a tunnel or
    // reverse proxy, request.url carries the INTERNAL host (localhost:3000),
    // so an absolute redirect threw the browser — and the preview iframe —
    // off the public origin onto localhost, where Brave's https upgrade then
    // met a plaintext port (ERR_SSL_PROTOCOL_ERROR). A relative Location
    // resolves against whatever origin the reader is actually on.
    return new Response(null, { status: 302, headers: { Location: `/api/blob/${token}` } });
  });
}
