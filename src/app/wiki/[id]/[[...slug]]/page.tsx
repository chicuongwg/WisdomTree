import { permanentRedirect } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { getNode } from "@/modules/knowledge/service";
import { wikiPath } from "@/lib/wiki-path";
import NodeDetailPage from "@/app/tree/node/[id]/page";

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug?: string[] }> }) {
  const user = await requireUser();
  const { id } = await params;
  const node = await getNode(toPrincipal(user), id);
  return { title: node.title, alternates: { canonical: wikiPath(node.id, node.slug) } };
}

export default async function CanonicalWikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; slug?: string[] }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  const { id, slug } = await params;
  const node = await getNode(toPrincipal(user), id);
  if (slug?.length !== 1 || slug[0] !== node.slug) permanentRedirect(wikiPath(node.id, node.slug));
  return NodeDetailPage({ params: Promise.resolve({ id }), searchParams });
}
