import { NextResponse } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  getAppProjectNoteHistoryVersion,
  restoreAppProjectNoteVersionToDraft,
  toApplicationError,
} from "@/modules/application";

async function input(params: Promise<{ projectId: string; noteId: string; seq: string }>) {
  const { projectId, noteId, seq: rawSeq } = await params;
  const seq = Number(rawSeq);
  if (!Number.isInteger(seq) || seq < 1) {
    throw new ApiError(400, "invalid_version", "Version must be a positive integer.");
  }
  return { projectId, noteId, seq };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; noteId: string; seq: string }> },
) {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json({
      version: await getAppProjectNoteHistoryVersion(actor, await input(params)),
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; noteId: string; seq: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const value = await input(params);
    return NextResponse.json({ draft: await restoreAppProjectNoteVersionToDraft(actor, value) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
