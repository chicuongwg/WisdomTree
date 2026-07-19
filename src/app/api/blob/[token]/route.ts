import { handleApi, notFound } from "@/lib/errors";
import { verifyDownload } from "@/lib/sign";
import { objectStore } from "@/modules/storage/object-store";

// GET /api/blob/{token} — the signed-URL substitute for local-FS object
// storage: token-authorized (short-lived, single object), like an S3
// pre-signed URL. Unknown/expired tokens → 404. Not part of openapi.yaml;
// it stands in for the object-storage host itself.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleApi(async () => {
    const { token } = await params;
    const grant = verifyDownload(token);
    if (!grant) throw notFound();
    const object = await objectStore.get(grant.objectKey).catch(() => null);
    if (!object) throw notFound();
    return new Response(new Uint8Array(object.body), {
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(grant.filename)}`,
      },
    });
  });
}
