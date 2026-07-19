import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createDeadline, listDeadlines } from "@/modules/pm/service";

// GET /api/deadlines?spaceId= — deadlines across the caller's projects.
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const spaceId = request.nextUrl.searchParams.get("spaceId") ?? undefined;
    return NextResponse.json(await listDeadlines(actor, spaceId));
  });
}

// POST /api/deadlines — create (project members = space members; 403 outside).
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) ?? {};
    const deadline = await createDeadline(actor, body);
    return NextResponse.json(deadline, { status: 201 });
  });
}
