import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  listAppMaterialVersions,
  listAppNoteVersions,
  toApplicationError,
} from "@/modules/application";
import { resolveExistingTargetDraft } from "../_lib";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;

    // Security Invariant: Verify target draft mutation authorization before reading versions
    await resolveExistingTargetDraft(actor, projectId, noteId);

    const type = request.nextUrl.searchParams.get("type");
    const id = request.nextUrl.searchParams.get("id");

    if (!id || (type !== "material" && type !== "note")) {
      throw new ApiError(
        400,
        "invalid_input",
        "Valid type ('material' or 'note') and id are required.",
      );
    }

    if (type === "material") {
      const versions = await listAppMaterialVersions(actor, id);
      return NextResponse.json({
        versions: versions.map((v) => ({
          id: v.id,
          seq: v.seq,
          filename: v.originalFilename,
          storedAt: v.storedAt,
        })),
      });
    } else {
      const versions = await listAppNoteVersions(actor, id);
      return NextResponse.json({
        versions: versions.map((v) => ({
          id: v.id,
          seq: v.seq,
          title: v.title,
          createdAt: v.createdAt,
        })),
      });
    }
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
