import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setApplicationLocale } from "@/modules/application";

export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;
    if (!body || (body.locale !== "vi" && body.locale !== "en")) {
      throw new ApiError(400, "invalid_locale", "Locale must be vi or en.");
    }
    const actor = await requirePrincipal();
    return NextResponse.json(await setApplicationLocale(actor, body.locale));
  });
}
