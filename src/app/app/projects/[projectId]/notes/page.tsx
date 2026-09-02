import { listAppProjectNotes } from "@/modules/application";
import { requireProjectModule } from "../_lib/workspace-context";
import { NotesView } from "./_components/notes-view";

export default async function ProjectNotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "notes");
  const { notes, drafts } = await listAppProjectNotes(actor, projectId);

  return (
    <NotesView
      projectId={projectId}
      locale={application.locale}
      notes={notes}
      drafts={drafts}
      canCreateNote={Boolean(workspace.project.capabilities.canCreateNote)}
    />
  );
}
