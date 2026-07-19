import { NextResponse, type NextRequest } from "next/server";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/modules/auth/schema";
import { ApiError, handleApi } from "@/lib/errors";
import { issueSessionToken, SESSION_COOKIE } from "@/modules/auth/session";

// POST /api/auth/dev-login — DEV-ONLY route, not part of openapi.yaml.
// This is the demo's auth substitution (demo-brief.md): a user picker over
// seeded users issuing a session; V1 replaces it with Google OIDC.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const { userId } = (await request.json()) as { userId?: string };
    if (!userId) throw new ApiError(400, "missing_user", "Vui lòng chọn người dùng.");
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.disabledAt)));
    if (!user) throw new ApiError(400, "unknown_user", "Người dùng không tồn tại.");

    const response = NextResponse.json({ userId: user.id, displayName: user.displayName, role: user.role });
    response.cookies.set(SESSION_COOKIE, issueSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  });
}
