import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listUsers } from "@/modules/auth/admin";

// GET /api/admin/users — every account, for the Admin Console's member table.
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await listUsers(actor));
  });
}
