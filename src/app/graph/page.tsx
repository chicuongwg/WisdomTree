import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { knowledgeGraph } from "@/modules/knowledge/service";
import { T } from "@/lib/vi";
import { KnowledgeMap } from "../components/knowledge-map";

// Screen: Graph Explorer (`/graph`, screen-inventory.md) — the knowledge tree
// seen as a map instead of an outline. This is the answer to "the knowledge
// tree looks like a project folder tree": here a page is a mark among its
// neighbours, not a file in a folder.
export default async function GraphPage() {
  const user = await requireUser();
  const graph = await knowledgeGraph(toPrincipal(user));

  return (
    <main className="page">
      <h1>{T.graph}</h1>
      <p className="muted">
        {T.graphIntro} <Link href="/tree">{T.tree}</Link> ·{" "}
        <Link href="/tree/branches">{T.navBranches}</Link>
      </p>
      <KnowledgeMap nodes={graph.nodes} edges={graph.edges} showFilters />
    </main>
  );
}
