import { type NextRequest } from "next/server";
import { ApiError, handleApi, notFound } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getPhysicalCover, setPhysicalCover } from "@/modules/storage/physical";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const object = await getPhysicalCover(actor, sourceId);
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
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "missing_file", "Please choose a cover image.");
    }
    await setPhysicalCover(actor, sourceId, file);
    return new Response(null, { status: 204 });
  });
}
