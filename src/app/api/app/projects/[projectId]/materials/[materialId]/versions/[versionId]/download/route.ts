import { NextResponse, type NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/request";
import {
  getAppProjectMaterialVersionDownloadToken,
  toApplicationError,
} from "@/modules/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; materialId: string; versionId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, materialId, versionId } = await params;
    const token = await getAppProjectMaterialVersionDownloadToken(actor, {
      projectId,
      materialId,
      sourceVersionId: versionId,
    });
    // Keep the browser on its public origin; a standalone server or reverse
    // proxy may expose an internal host through request.url.
    return new Response(null, {
      status: 302,
      headers: { Location: `/api/blob/${encodeURIComponent(token)}` },
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
