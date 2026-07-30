import { NextResponse } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setVaultGrant } from "@/modules/auth/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vaultId: string; userId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { vaultId, userId } = await params;
    const body = (await request.json().catch(() => null)) as { grant?: string } | null;
    if (!body || !["viewer", "editor", "reviewer", "owner"].includes(body.grant ?? "")) {
      throw new ApiError(400, "invalid_vault_grant", "Vault grant không hợp lệ.");
    }
    await setVaultGrant(
      actor,
      vaultId,
      userId,
      body.grant as "viewer" | "editor" | "reviewer" | "owner",
    );
    return new NextResponse(null, { status: 204 });
  });
}
