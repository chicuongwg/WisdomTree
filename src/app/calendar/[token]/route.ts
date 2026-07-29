import { handleApi } from "@/lib/errors";
import { renderCalendarFeed } from "@/modules/pm/service";

// GET /calendar/{token}.ics — outbound ICS deadline feed. Token-authenticated
// (calendar_tokens), NO session; unknown or revoked token → 404
// (docs/design/openapi.yaml, database-schema.md § calendar_tokens).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleApi(async () => {
    const { token } = await params;
    // The route segment captures "abc123.ics"; the stored token has no suffix.
    const body = await renderCalendarFeed(decodeURIComponent(token).replace(/\.ics$/, ""));
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="wisdomtree.ics"',
        "Cache-Control": "no-store",
      },
    });
  });
}
