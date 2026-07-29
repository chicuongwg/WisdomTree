import assert from "node:assert";
import { SESSION_COOKIE } from "@/modules/auth/session";

export const run = async () => {
  // Ensure dev login is enabled for the handler
  process.env.ENABLE_DEV_LOGIN = "1";
  (process.env as Record<string, string>).NODE_ENV = "development";

  // Import helpers and seeded users
  const { listSignInCandidates } = await import("@/modules/auth/dev-auth");
  const users = await listSignInCandidates();
  assert.ok(users.length > 0, "expected seeded users to be present");
  const user = users[0];

  // Import the route handler
  const mod = await import("@/app/api/auth/dev-login/route");
  const { POST } = mod;
  if (typeof POST !== "function") throw new Error("POST handler not found");

  // Create a minimal fake request with json() method
  const fakeRequest = {
    async json() {
      return { userId: user.id };
    },
  } as any;

  const res: any = await POST(fakeRequest);
  // NextResponse is used; try to read status and set-cookie header
  const status = res?.status ?? 200;
  assert.ok(status === 200, `expected 200, got ${status}`);

  // Check cookie: NextResponse may attach Set-Cookie header
  const headers = (res && typeof res.headers?.get === "function") ? res.headers : res?.headers || {};
  let setCookie: any = null;
  try {
    if (headers && typeof headers.get === "function") setCookie = headers.get("set-cookie") || headers.get("Set-Cookie");
    else if (headers && (headers as any)["set-cookie"]) setCookie = (headers as any)["set-cookie"];
  } catch (e) {
    // ignore
  }

  // If not found in headers, check cookies API if present
  if (!setCookie && res?.cookies && typeof res.cookies.get === "function") {
    const cookie = res.cookies.get(SESSION_COOKIE);
    if (cookie) setCookie = cookie.value ?? JSON.stringify(cookie);
  }

  assert.ok(setCookie, "response must set a session cookie");
  // Check cookie flags: HttpOnly and SameSite (should be 'lax')
  const sc = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
  const hasHttpOnly = /httponly/i.test(sc);
  const hasSameSite = /samesite=(lax)/i.test(sc);
  assert.ok(hasHttpOnly, `Set-Cookie must include HttpOnly, got: ${sc}`);
  assert.ok(hasSameSite, `Set-Cookie must include SameSite=Lax, got: ${sc}`);
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
