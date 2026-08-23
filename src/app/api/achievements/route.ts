import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { logAchievement } from "@/modules/pm/service";

// POST /api/achievements — log an achievement.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) ?? {};
    const achievement = await logAchievement(actor, body);
    return NextResponse.json(achievement, { status: 201 });
  });
}
