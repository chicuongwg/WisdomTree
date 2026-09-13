import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProject, listAppProjects, toApplicationError } from "@/modules/application";

export async function GET() {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json({ projects: await listAppProjects(actor) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.name !== "string" || typeof body.researchLens !== "string") {
      throw new ApiError(400, "invalid_project", "Project name and research lens are required.");
    }
    const project = await createAppProject(actor, {
      name: body.name,
      researchLens: body.researchLens,
      ...(typeof body.description === "string" ? { description: body.description } : {}),
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
