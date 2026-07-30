import { type NextRequest } from "next/server";
import { ApiError, handleApi, notFound } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getCatalogCover, setCatalogCover } from "@/modules/catalog/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { itemId } = await params;
    const object = await getCatalogCover(actor, itemId);
    if (!object) throw notFound();
    return new Response(new Uint8Array(object.body), {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { itemId } = await params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "missing_file", "Hãy chọn ảnh bìa.");
    }
    await setCatalogCover(actor, itemId, file);
    return new Response(null, { status: 204 });
  });
}
