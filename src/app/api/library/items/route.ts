import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createPhysicalItem } from "@/modules/storage/physical";

// POST /api/library/items — Admin/Op adds a physical book to the Library
// (one source row, category "Sách", plus its shelf facts).
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json()) as {
      title?: string;
      author?: string;
      location?: string;
      spaceId?: string;
      copies?: unknown;
    };
    return NextResponse.json(await createPhysicalItem(actor, body), { status: 201 });
  });
}
