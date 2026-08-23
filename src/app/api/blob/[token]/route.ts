import { handleApi, notFound } from "@/lib/errors";
import { verifyDownload } from "@/lib/sign";
import { getObject } from "@/modules/storage/object-store";

// GET /api/blob/{token} — the signed-URL substitute for local-FS object
// storage: token-authorized (short-lived, single object), like an S3
// pre-signed URL. Unknown/expired tokens → 404. Not part of the public API;
// it stands in for the object-storage host itself.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleApi(async () => {
    const { token } = await params;
    const grant = verifyDownload(token);
    if (!grant) throw notFound();
    const object = await getObject(grant.objectKey).catch(() => null);
    if (!object) throw notFound();
    // Images and PDFs render in the page (the detail screen's preview panel);
    // everything else downloads. nosniff so the browser honours the stored
    // content type instead of guessing something executable.
    const inline =
      object.contentType.startsWith("image/") || object.contentType === "application/pdf";
    return new Response(new Uint8Array(object.body), {
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(grant.filename)}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
