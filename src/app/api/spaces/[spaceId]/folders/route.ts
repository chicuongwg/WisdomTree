import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createFolder, listFolders } from "@/modules/storage/service";

// GET /api/spaces/{spaceId}/folders — flat folder rows for one space
export async function GET(_request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId } = await params;
    return NextResponse.json(await listFolders(actor, spaceId));
  });
}

// POST /api/spaces/{spaceId}/folders — any member of the space; 409 on a
// duplicate name in the same place
export async function POST(request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      parentId?: string | null;
      name?: string;
    };
    const folder = await createFolder(actor, {
      spaceId,
      parentId: body.parentId,
      name: body.name ?? "",
    });
    return NextResponse.json(folder, { status: 201 });
  });
}
