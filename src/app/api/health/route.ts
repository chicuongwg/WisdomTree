import { databaseReachable } from "@/modules/export/service";

// GET /api/health — unauthenticated liveness+readiness probe for the container
// healthcheck and any proxy in front of it. Deliberately says nothing beyond
// whether the process can reach its database: /api/admin/health is the
// operator-facing report and stays behind an admin principal.
export async function GET() {
  // 503, not 500: the process is alive but must not be sent traffic yet.
  return (await databaseReachable())
    ? Response.json({ status: "ok" })
    : Response.json({ status: "degraded" }, { status: 503 });
}
