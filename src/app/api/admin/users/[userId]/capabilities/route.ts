import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setUserCapabilities } from "@/modules/auth/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { userId } = await params;
    const body = (await request.json().catch(() => null)) as {
      capabilities?: unknown;
    } | null;
    if (!body || !Array.isArray(body.capabilities) || body.capabilities.some((item) => typeof item !== "string")) {
      throw new ApiError(400, "invalid_capability", "Danh sách capability không hợp lệ.");
    }
    await setUserCapabilities(actor, userId, body.capabilities);
    return new NextResponse(null, { status: 204 });
  });
}
