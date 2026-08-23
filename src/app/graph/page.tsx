import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { createGraphProvider } from "@/modules/graph/provider";
import { T } from "@/lib/vi";
import { KnowledgeMap } from "../components/knowledge-map";

export const metadata = { title: T.graph };

// Screen: Graph Explorer (`/graph`) — the knowledge tree
// seen as a map instead of an outline.
//
// `?scope=personal` switches to the actor's private note graph.
// `?node=<id>` centres the map on one node (from Node Detail).
export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string; scope?: string; depth?: string }>;
}) {
  const user = await requireUser();
  const principal = toPrincipal(user);
  const { node, scope, depth } = await searchParams;
  const requestedDepth = Number(depth);
  const initialDepth = Number.isFinite(requestedDepth)
    ? Math.min(5, Math.max(1, Math.round(requestedDepth)))
    : undefined;

  const isPersonal = scope === "personal";
  const graph = await createGraphProvider(principal).loadGraph({
    scope: isPersonal ? "personal" : "shared",
  });

  const teamHref = "/graph";
  const personalHref = "/graph?scope=personal";

  return (
    // `wide`: the map is the work surface of this screen, and the floating
    // control panel takes a bite out of it as well, so it gets the window
    // instead of the reading column (see main.page.wide in globals.css).
    <main className="page wide">
      <h1>{isPersonal ? T.navPersonalGraph : T.navTeamGraph}</h1>
      {/* Scope toggle — lets the reader switch between the shared project
          knowledge graph and their own private note graph without leaving
          the surface. URL-based so bookmarks and back-navigation work. */}
      <nav className="graph-scope-tabs" aria-label="Chọn bản đồ">
        <Link
          href={teamHref}
          className={`graph-scope-tab${!isPersonal ? " active" : ""}`}
          aria-current={!isPersonal ? "page" : undefined}
        >
          {T.graphScopeTeam}
        </Link>
        <Link
          href={personalHref}
          className={`graph-scope-tab graph-scope-tab--personal${isPersonal ? " active" : ""}`}
          aria-current={isPersonal ? "page" : undefined}
        >
          {T.graphScopePersonal}
        </Link>
      </nav>
      <p className="muted">
        {T.graphIntro} <Link href="/tree">{T.tree}</Link> ·{" "}
        <Link href="/tree/branches">{T.navBranches}</Link>
      </p>
      <KnowledgeMap
        nodes={graph.nodes.map((item) => ({
          id: item.id,
          title: item.title,
          branchId: item.topicId ?? "",
          branchName: item.path.split("/")[0],
          verification: item.verification,
          tags: item.tags,
        }))}
        edges={graph.edges.map((edge) => ({ ...edge, linkType: edge.type }))}
        centerId={node}
        scope={isPersonal ? "personal" : "shared"}
        initialDepth={initialDepth}
      />
    </main>
  );
}
