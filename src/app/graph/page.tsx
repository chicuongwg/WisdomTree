import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { knowledgeGraph } from "@/modules/knowledge/service";
import { T } from "@/lib/vi";
import { KnowledgeMap } from "../components/knowledge-map";

export const metadata = { title: T.graph };

// Screen: Graph Explorer (`/graph`, screen-inventory.md) — the knowledge tree
// seen as a map instead of an outline. This is the answer to "the knowledge
// tree looks like a project folder tree": here a page is a mark among its
// neighbours, not a file in a folder.
//
// `?node=<id>` is the whole map centred on one page — where Node Detail sends
// a reader who wants to see the page in context. Node Detail used to embed a
// second copy of this component to say the same thing in 600px of its own.
export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const user = await requireUser();
  const [graph, { node }] = await Promise.all([knowledgeGraph(toPrincipal(user)), searchParams]);

  return (
    // `wide`: the map is the work surface of this screen, and the floating
    // control panel takes a bite out of it as well, so it gets the window
    // instead of the reading column (see main.page.wide in globals.css).
    <main className="page wide">
      <h1>{T.graph}</h1>
      <p className="muted">
        {T.graphIntro} <Link href="/tree">{T.tree}</Link> ·{" "}
        <Link href="/tree/branches">{T.navBranches}</Link>
      </p>
      <KnowledgeMap nodes={graph.nodes} edges={graph.edges} centerId={node} />
    </main>
  );
}
