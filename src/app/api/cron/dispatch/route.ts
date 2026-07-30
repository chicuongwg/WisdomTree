import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchOutbox } from "@/modules/notify/dispatcher";

// POST /api/cron/dispatch — authenticated safety net for the transactional outbox.
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
    await dispatchOutbox();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron:dispatch] outbox tick failed:", err);
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 500 });
  }
}
