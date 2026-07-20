import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { deleteFolder, renameFolder } from "@/modules/storage/service";

// PATCH /api/folders/{folderId} — creator or Admin/Op renames
export async function PATCH(request: Request, { params }: { params: Promise<{ folderId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { folderId } = await params;
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    await renameFolder(actor, folderId, body.name ?? "");
    return new NextResponse(null, { status: 204 });
  });
}

// DELETE /api/folders/{folderId} — only when empty (409 otherwise)
export async function DELETE(_request: Request, { params }: { params: Promise<{ folderId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { folderId } = await params;
    await deleteFolder(actor, folderId);
    return new NextResponse(null, { status: 204 });
  });
}
