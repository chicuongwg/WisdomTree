import { getAppProjectLibrary } from "@/modules/application";
import { LibraryView } from "./_components/library-view";
import { requireProjectModule } from "../_lib/workspace-context";

export default async function ProjectLibraryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { actor, application } = await requireProjectModule(projectId, "library");
  const library = await getAppProjectLibrary(actor, projectId);
  return <LibraryView projectId={projectId} locale={application.locale} library={library} />;
}
