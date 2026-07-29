import { NextResponse, type NextRequest } from "next/server";

// Protect everything except public routes. This is a GATE, not authorization —
// it only checks "is there a session cookie at all?" The real authorize() call
// still happens in the route handler.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",
  "/api/health",
  "/api/cron/",
  "/api/blob/",
  "/calendar/",
  "_next/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public routes through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session cookie existence (not validity — that's session.ts's job)
  const session = request.cookies.get("session")?.value;
  if (!session && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { code: "unauthorized", message: "Bạn cần đăng nhập." },
      { status: 401 },
    );
  }
  if (!session && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static files and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
