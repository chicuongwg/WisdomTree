import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { inviteUser } from "@/modules/auth/admin";
import { ACCESS_TITLES, type AccessTitle } from "@/modules/auth/access-titles";

const TITLE_KEYS = ACCESS_TITLES.map((title) => title.key);

// POST /api/admin/users/invite — { email, displayName, accessTitle? } → 201 with the
// new row's id. Validation (email shape, name, duplicate) lives in inviteUser;
// this route only narrows role to the known set and lets the module object.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      displayName?: unknown;
      accessTitle?: unknown;
      reviewerVaultIds?: unknown;
    } | null;
    if (
      !body ||
      (body.accessTitle !== undefined &&
        (typeof body.accessTitle !== "string" ||
          !TITLE_KEYS.includes(body.accessTitle as AccessTitle))) ||
      (body.reviewerVaultIds !== undefined &&
        (!Array.isArray(body.reviewerVaultIds) ||
          body.reviewerVaultIds.some((id) => typeof id !== "string")))
    ) {
      throw new ApiError(400, "invalid_invite", "Thông tin mời thành viên không hợp lệ.");
    }
    const created = await inviteUser(actor, {
      email: typeof body?.email === "string" ? body.email : undefined,
      displayName: typeof body?.displayName === "string" ? body.displayName : undefined,
      accessTitle: TITLE_KEYS.includes(body?.accessTitle as AccessTitle)
        ? (body?.accessTitle as AccessTitle)
        : undefined,
      reviewerVaultIds:
        Array.isArray(body?.reviewerVaultIds) &&
        body.reviewerVaultIds.every((id) => typeof id === "string")
          ? body.reviewerVaultIds
          : [],
    });
    return NextResponse.json(created, { status: 201 });
  });
}
