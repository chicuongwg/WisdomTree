import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectNote, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      summary?: unknown;
      contentMd?: unknown;
      researchPurpose?: unknown;
    } | null;

    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      throw new ApiError(400, "invalid_input", "Note title is required.");
    }

    const title = body.title.trim();
    if (title.length > 200) {
      throw new ApiError(400, "invalid_input", "Note title is too long.");
    }
    if (
      body.researchPurpose !== undefined &&
      body.researchPurpose !== null &&
      body.researchPurpose !== "evidence" &&
      body.researchPurpose !== "synthesis"
    ) {
      throw new ApiError(400, "invalid_input", "Research purpose is invalid.");
    }

    const summary = typeof body.summary === "string" ? body.summary.trim() || null : null;
    const contentMd = typeof body.contentMd === "string" ? body.contentMd : "";
    const researchPurpose = body.researchPurpose as "evidence" | "synthesis" | null | undefined;

    const draft = await createAppProjectNote(actor, {
      projectId,
      title,
      summary,
      contentMd,
      researchPurpose,
    });

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
