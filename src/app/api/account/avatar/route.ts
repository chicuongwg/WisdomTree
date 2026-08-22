import { type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setAvatar } from "@/modules/auth/profile";

// POST /api/account/avatar — multipart, one `file` part. Type and size limits
// live in the service (PNG/JPEG/WebP, ≤ 2 MB → 415 / 413).
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "missing_file", "An image file is required.");
    }
    await setAvatar(actor, file);
    return new Response(null, { status: 204 });
  });
}
