import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createSpace, listMemberSpaces } from "@/modules/storage/service";

// GET /api/spaces — members see own spaces; Admin/Op sees all
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await listMemberSpaces(actor));
  });
}

// POST /api/spaces — Admin/Op creates a team space (storage.space.manage).
export async function POST(request: Request) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json()) as { name?: string };
    return NextResponse.json(await createSpace(actor, body), { status: 201 });
  });
}
