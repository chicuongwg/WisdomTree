import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getNodeTranslation, saveNodeTranslation } from "@/modules/knowledge/service";

function locale(value: string): "en" {
  if (value !== "en") throw new ApiError(400, "invalid_locale", "Only English is optional.");
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string; locale: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId, locale: value } = await params;
    return NextResponse.json(await getNodeTranslation(actor, nodeId, locale(value)));
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string; locale: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId, locale: value } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: string;
      summary?: string;
      contentMd?: string;
      expectedVersion?: number;
    } | null;
    if (!body?.title?.trim() || typeof body.contentMd !== "string")
      throw new ApiError(400, "invalid_translation", "Title and content are required.");
    return NextResponse.json(
      await saveNodeTranslation(actor, nodeId, locale(value), {
        title: body.title,
        summary: body.summary,
        contentMd: body.contentMd,
        expectedVersion:
          typeof body.expectedVersion === "number" ? body.expectedVersion : undefined,
      }),
    );
  });
}
