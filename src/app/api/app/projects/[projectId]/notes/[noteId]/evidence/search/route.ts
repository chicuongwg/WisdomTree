import { NextResponse, type NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/request";
import {
  listAppProjectMaterials,
  listAppProjectNotes,
  getProjectWorkspace,
  searchAppResearch,
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

    // Security Invariant: Verify target draft mutation authorization before reading research
    await resolveExistingTargetDraft(actor, projectId, noteId);

    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "project";

    if (query) {
      const searchResults = await searchAppResearch(actor, {
        query,
        types: ["material", "note"],
        projectIds: scope === "project" ? [projectId] : undefined,
        limit: 20,
      });

      const results = searchResults
        .filter(
          (item): item is Extract<typeof item, { kind: "material" | "note" }> =>
            item.kind === "material" || item.kind === "note",
        )
        .map((item) => ({
          kind: item.kind,
          id: item.id,
          title: item.title,
          summary: item.summary,
          project: item.project,
        }));

      return NextResponse.json({ results });
    }

    // Empty query in project scope: list current project's materials and official notes only
    if (scope === "project") {
      const [materials, notesData, workspace] = await Promise.all([
        listAppProjectMaterials(actor, projectId),
        listAppProjectNotes(actor, projectId),
        getProjectWorkspace(actor, projectId),
      ]);

      // CRITICAL INVARIANT: Only official Notes are valid evidence. Private drafts are strictly excluded.
      const officialNotes = notesData.notes;

      const results = [
        ...materials.map((m) => ({
          kind: "material" as const,
          id: m.id,
          title: m.title,
          summary: null,
          project: { id: projectId, name: workspace.project.name },
        })),
        ...officialNotes.map((n) => ({
          kind: "note" as const,
          id: n.id,
          title: n.title,
          summary: n.summary,
          project: { id: projectId, name: workspace.project.name },
        })),
      ];

      return NextResponse.json({ results });
    }

    return NextResponse.json({ results: [] });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
