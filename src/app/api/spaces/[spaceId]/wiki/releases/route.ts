import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createSpaceRelease, listSpaceReleases } from "@/modules/export/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId } = await params;
    return NextResponse.json(await listSpaceReleases(actor, spaceId));
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId } = await params;
    return NextResponse.json(await createSpaceRelease(actor, spaceId), { status: 201 });
  });
}
