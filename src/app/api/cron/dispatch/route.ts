import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { checkDeadlineReminders } from "@/modules/notify/fanout";
import { purgeStaleSessions } from "@/modules/auth/session";

// POST /api/cron/dispatch — the time-driven housekeeping tick: deadline
// reminders (the one notification not written by its mutation) and the
// stale-session purge.
export const dynamic = "force-dynamic";

function bearerMatches(request: Request, expected: string): boolean {
  const prefix = "Bearer ";
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith(prefix)) return false;
  const supplied = Buffer.from(authorization.slice(prefix.length));
  const wanted = Buffer.from(expected);
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron:dispatch] CRON_SECRET is not configured");
    return NextResponse.json({ ok: false, error: "cron_unavailable" }, { status: 503 });
  }
  if (!bearerMatches(request, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await checkDeadlineReminders();
    await purgeStaleSessions();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron:dispatch] reminder tick failed:", err);
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 500 });
  }
}
