import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createBranch } from "@/modules/knowledge/service";

// POST /api/tree/branches — Editor creates a branch (201)
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      description?: string;
      scope?: string;
      spaceId?: string;
    } | null;
    if (!body?.name?.trim()) {
      throw new ApiError(400, "invalid_branch", "Branch name must not be empty.");
    }
    const branch = await createBranch(actor, {
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      scope: body.scope,
      spaceId: body.spaceId,
    });
    return NextResponse.json(branch, { status: 201 });
  });
}
