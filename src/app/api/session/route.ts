import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { currentUser } from "@/modules/auth/session";
import { unauthorized } from "@/lib/errors";

// GET /api/session — the signed-in principal for the FE shell
export async function GET() {
  return handleApi(async () => {
    const user = await currentUser();
    if (!user) throw unauthorized();
    return NextResponse.json({
      userId: user.id,
      displayName: user.displayName,
      role: user.role,
      spaceIds: user.spaceIds,
      locale: user.locale,
    });
  });
}
