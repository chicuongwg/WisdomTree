import { getAppResearchGraph } from "@/modules/application";
import { notFound } from "next/navigation";
import Link from "next/link";
import { KnowledgeMap } from "../../components/knowledge-map";
import {
  Button,
  EmptyState,
  PageContainer,
  PageHeader,
  Stack,
  translate,
} from "../../components/ui-next";
import { getAppRequestContext } from "../_lib/request-context";

export default async function AppResearchGraphPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; depth?: string; projectId?: string }>;
}) {
  const [{ node, depth, projectId }, { actor, application, projects }] = await Promise.all([
    searchParams,
    getAppRequestContext(),
  ]);
  if (projectId && !projects.some((project) => project.id === projectId)) notFound();
  const graph = await getAppResearchGraph(actor, { projectId });
  const requestedDepth = Number(depth);
  const initialDepth = Number.isFinite(requestedDepth)
    ? Math.min(5, Math.max(1, Math.round(requestedDepth)))
    : undefined;
  const legend = (["project", "note", "material", "person", "activity"] as const).map((kind) => [
    kind,
    translate(application.locale, `graph.kind.${kind}`),
  ]) as Array<[string, string]>;

  return (
    <PageContainer width="full">
      <Stack>
        <PageHeader
          title={translate(application.locale, "page.graph.title")}
          description={translate(application.locale, "page.graph.description")}
        />
        <form className="ui-next-inline ui-next-graph-scope" method="get">
          {node ? <input type="hidden" name="node" value={node} /> : null}
          {depth ? <input type="hidden" name="depth" value={depth} /> : null}
          <label>
            <span>{translate(application.locale, "graph.scope")}</span>
            <select className="ui-next-control" name="projectId" defaultValue={projectId ?? ""}>
              <option value="">{translate(application.locale, "graph.allProjects")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.isPersonal
                    ? translate(application.locale, "projects.myProject")
                    : project.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            {translate(application.locale, "calendar.apply")}
          </Button>
        </form>
        {graph.nodes.length > 0 && graph.edges.length === 0 ? (
          <section aria-labelledby="graph-sparse-title">
            <h2 id="graph-sparse-title">{translate(application.locale, "graph.sparseTitle")}</h2>
            <p>{translate(application.locale, "graph.sparseDescription")}</p>
            <Link href={projectId ? `/app/projects/${projectId}` : "/app/projects"}>
              {translate(application.locale, "nav.projects")}
            </Link>
          </section>
        ) : null}
        {graph.nodes.length ? (
          <KnowledgeMap
            nodes={graph.nodes.map((item) => ({
              id: item.id,
              title: item.title,
              branchId: item.projectId,
              branchName: item.projectName,
              tags: [item.kind],
              kind: item.kind,
              href: item.href,
              excerpt: item.summary ?? "",
            }))}
            edges={graph.edges}
            centerId={node}
            initialDepth={initialDepth}
            targetGraph
            locale={application.locale}
            targetLegend={legend}
            targetScopeLabels={{
              filter: translate(application.locale, "graph.filterProject"),
              all: translate(application.locale, "graph.allProjects"),
            }}
          />
        ) : (
          <EmptyState
            title={translate(application.locale, "graph.emptyTitle")}
            description={translate(application.locale, "graph.emptyDescription")}
          />
        )}
      </Stack>
    </PageContainer>
  );
}
