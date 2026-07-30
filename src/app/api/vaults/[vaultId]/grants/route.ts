import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listVaultGrants } from "@/modules/auth/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { vaultId } = await params;
    return NextResponse.json(await listVaultGrants(actor, vaultId));
  });
}
