import { cookies } from "next/headers";
import { revokeSessionToken, SESSION_COOKIE } from "@/modules/auth/session";

// POST /api/auth/logout — 204
export async function POST() {
  const jar = await cookies();
  await revokeSessionToken(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
