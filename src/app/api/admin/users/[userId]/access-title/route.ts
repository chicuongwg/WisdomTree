import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { ACCESS_TITLES, type AccessTitle } from "@/modules/auth/access-titles";
import { applyUserAccessTitle } from "@/modules/auth/admin";

const TITLE_KEYS = ACCESS_TITLES.map((title) => title.key);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { userId } = await params;
    const body = (await request.json().catch(() => null)) as {
      accessTitle?: unknown;
      reviewerVaultIds?: unknown;
    } | null;
    if (
      !body ||
      typeof body.accessTitle !== "string" ||
      !TITLE_KEYS.includes(body.accessTitle as AccessTitle) ||
      !Array.isArray(body.reviewerVaultIds) ||
      body.reviewerVaultIds.some((id) => typeof id !== "string")
    ) {
      throw new ApiError(400, "invalid_access_title", "Chức danh không hợp lệ.");
    }
    await applyUserAccessTitle(
      actor,
      userId,
      body.accessTitle as AccessTitle,
      body.reviewerVaultIds,
    );
    return new NextResponse(null, { status: 204 });
  });
}
