import { handleApi, notFound } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getAvatar } from "@/modules/auth/profile";

// GET /api/avatar/{userId} — a teammate's picture, for any signed-in member:
// the same footing as the display name it sits beside. `private` because the
// session decides who may fetch it; five minutes because the page busts the
// cache itself (?v=avatarKey) whenever the picture changes.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  return handleApi(async () => {
    await requirePrincipal();
    const { userId } = await params;
    const object = await getAvatar(userId);
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
