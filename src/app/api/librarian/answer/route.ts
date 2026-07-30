import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { askLibrarian } from "@/modules/index/service";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json()) as { question?: string; vaultId?: string };
    const question = body.question?.trim();
    if (!question) throw new ApiError(400, "invalid_question", "Vui lòng nhập câu hỏi.");
    return NextResponse.json(await askLibrarian(actor, question, body.vaultId));
  });
}
