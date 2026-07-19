import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/modules/auth/session";

// POST /api/auth/logout — 204
export async function POST() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
