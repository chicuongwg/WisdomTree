import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listBoard, listSchedule } from "@/modules/pm/service";

// GET /api/board — operational board tasks (every role: pm.board.read).
// GET /api/board?from=<iso>&to=<iso> — the same board as a date range: tasks
// by due_at plus the project deadlines. One route rather than two, because the
// caller is asking the same question ("what is this team carrying") and only
// the shape of the answer differs.
function parseRange(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new ApiError(400, "invalid_range", "Invalid date range.");
  }
  return { from: start, to: end };
}

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (from === null && to === null) return NextResponse.json(await listBoard(actor));
    if (from === null || to === null) {
      throw new ApiError(400, "invalid_range", "Both a start and an end date are required.");
    }
    return NextResponse.json(await listSchedule(actor, parseRange(from, to)));
  });
}
