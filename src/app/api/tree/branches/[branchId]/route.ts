import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { updateBranch } from "@/modules/knowledge/service";

// PATCH /api/tree/branches/{branchId} — owned-or-assigned Editor, Admin/Op;
// optimistic-locked via expectedVersion (409 on conflict)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { branchId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      parentId?: string | null;
      sortOrder?: number;
      expectedVersion?: number;
    };
    return NextResponse.json(
      await updateBranch(actor, branchId, {
        name: body.name,
        description: body.description,
        parentId:
          body.parentId === null || typeof body.parentId === "string" ? body.parentId : undefined,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        expectedVersion:
          typeof body.expectedVersion === "number" ? body.expectedVersion : undefined,
      }),
    );
  });
}
