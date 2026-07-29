import { NextResponse } from "next/server";
import { dispatchOutbox } from "@/modules/notify/dispatcher";

// GET /api/cron/dispatch — background worker/cron safety net for transactional outbox
// Ensures undispatched notifications are drained in production/serverless environments.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dispatchOutbox();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron:dispatch] outbox tick failed:", err);
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 500 });
  }
}
