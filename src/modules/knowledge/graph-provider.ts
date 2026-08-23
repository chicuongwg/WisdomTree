import type {
  GraphData,
  GraphDataProvider,
  GraphEdge,
  GraphQuery,
  NodePreview,
} from "./graph-types";
import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
// The graph is knowledge's read side: it leans on branchVisibilityCondition
// and the knowledge tables directly, which is why it lives in this module.
import { branchVisibilityCondition } from "./service";
import { branches, nodeLinks, nodeTags, tags, treeNodes } from "./schema";

export function createGraphProvider(actor: Principal): GraphDataProvider {
  return {
    async loadGraph(query: GraphQuery): Promise<GraphData> {
      authorize(actor, "knowledge.graph.read", { kind: "read" });
      const rows = await db
        .select({
          id: treeNodes.id,
          title: treeNodes.title,
          slug: treeNodes.slug,
          contentMd: treeNodes.contentMd,
          verification: treeNodes.verification,
          createdAt: treeNodes.createdAt,
          updatedAt: treeNodes.updatedAt,
          branchId: branches.id,
          branchName: branches.name,
        })
        .from(treeNodes)
        .innerJoin(branches, eq(treeNodes.branchId, branches.id))
        .where(
          and(
            ne(treeNodes.verification, "archived"),
            branchVisibilityCondition(actor),
            query.scope === "shared"
              ? eq(branches.scope, "team")
              : eq(branches.scope, "personal"),
            query.search
              ? or(
                  sql`${treeNodes.title} ILIKE ${`%${query.search}%`}`,
                  sql`${treeNodes.contentMd} ILIKE ${`%${query.search}%`}`,
                )
              : undefined,
          ),
        )
        .orderBy(asc(treeNodes.title));
      if (!rows.length) return { nodes: [], edges: [] };

      const ids = rows.map((row) => row.id);
      const [tagRows, edgeRows] = await Promise.all([
        db
          .select({ nodeId: nodeTags.nodeId, name: tags.name })
          .from(nodeTags)
          .innerJoin(tags, eq(nodeTags.tagId, tags.id))
          .where(inArray(nodeTags.nodeId, ids)),
        db
          .select({
            from: nodeLinks.fromNodeId,
            to: nodeLinks.toNodeId,
            type: nodeLinks.linkType,
          })
          .from(nodeLinks)
          .where(
            and(
              inArray(nodeLinks.fromNodeId, ids),
              inArray(nodeLinks.toNodeId, ids),
              query.linkTypes?.length ? inArray(nodeLinks.linkType, query.linkTypes) : undefined,
            ),
          ),
      ]);
      const tagged = new Map<string, string[]>();
      for (const tag of tagRows)
        tagged.set(tag.nodeId, [...(tagged.get(tag.nodeId) ?? []), tag.name]);
      return {
        nodes: rows.map((row) => ({
          id: row.id,
          title: row.title,
          path: `${row.branchName}/${row.slug}.md`,
          topicId: row.branchId,
          tags: tagged.get(row.id) ?? [],
          properties: {},
          verification: row.verification,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        edges: edgeRows as GraphEdge[],
      };
    },

    async loadPreview(nodeId: string): Promise<NodePreview | null> {
      authorize(actor, "knowledge.graph.read", { kind: "read" });
      const [node] = await db
        .select({
          id: treeNodes.id,
          title: treeNodes.title,
          verification: treeNodes.verification,
          excerpt: sql<string>`left(${treeNodes.contentMd}, 220)`,
        })
        .from(treeNodes)
        .innerJoin(branches, eq(treeNodes.branchId, branches.id))
        .where(and(eq(treeNodes.id, nodeId), branchVisibilityCondition(actor)));
      return node ?? null;
    },
  };
}
