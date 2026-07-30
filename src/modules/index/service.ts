import {
  parseSearchQuery,
  type AccessContext,
  type CitedAnswer,
  type IndexProvider,
  type LibrarianProvider,
  type QueryNode,
  type SearchRequest,
  type SearchResult,
} from "@wisdomtree/index-librarian";
import { and, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { branchVisibilityCondition } from "../knowledge/service";
import { branches, nodeTags, tags, treeNodes } from "../knowledge/schema";
import { sources, sourceVersions, textChunks } from "../storage/schema";

const RESULT_LIMIT = 20;

function accessOf(actor: Principal): AccessContext {
  return {
    identityId: actor.userId,
    systemCapabilities: actor.capabilities ?? [],
    vaultGrants: actor.vaultGrants ?? [],
    spaceIds: actor.spaceIds,
  };
}

function termSql(node: Extract<QueryNode, { type: "term" }>, kind: "note" | "chunk"): SQL {
  const pattern = `%${node.value}%`;
  if (node.field === "file") {
    return kind === "note"
      ? sql`${treeNodes.title} ILIKE ${pattern}`
      : sql`${sources.title} ILIKE ${pattern}`;
  }
  if (node.field === "path") {
    return kind === "note"
      ? sql`(${branches.name} ILIKE ${pattern} OR ${treeNodes.slug} ILIKE ${pattern})`
      : sql`${sourceVersions.originalFilename} ILIKE ${pattern}`;
  }
  if (node.field === "content") {
    return kind === "note"
      ? sql`${treeNodes.contentMd} ILIKE ${pattern}`
      : sql`${textChunks.content} ILIKE ${pattern}`;
  }
  if (node.field === "tag") {
    return kind === "note"
      ? sql`EXISTS (
          SELECT 1 FROM ${nodeTags}
          INNER JOIN ${tags} ON ${tags.id} = ${nodeTags.tagId}
          WHERE ${nodeTags.nodeId} = ${treeNodes.id}
            AND ${tags.name} ILIKE ${pattern}
        )`
      : sql`false`;
  }
  if (node.field === "property") {
    const propertyPattern = `%${node.property}:%${node.value}%`;
    return kind === "note" ? sql`${treeNodes.contentMd} ILIKE ${propertyPattern}` : sql`false`;
  }

  const vector = kind === "note" ? sql`${treeNodes}.tsv` : sql`${textChunks}.tsv`;
  const query = node.phrase
    ? sql`phraseto_tsquery('simple', immutable_unaccent(${node.value}))`
    : sql`plainto_tsquery('simple', immutable_unaccent(${node.value}))`;
  const title = kind === "note" ? treeNodes.title : sources.title;
  return sql`(${vector} @@ ${query} OR ${title} ILIKE ${pattern})`;
}

function querySql(node: QueryNode, kind: "note" | "chunk"): SQL {
  if (node.type === "term") return termSql(node, kind);
  if (node.type === "not") return sql`NOT (${querySql(node.child, kind)})`;
  const left = querySql(node.left, kind);
  const right = querySql(node.right, kind);
  return node.type === "and" ? sql`(${left} AND ${right})` : sql`(${left} OR ${right})`;
}

export async function searchIndex(
  actor: Principal,
  request: SearchRequest,
): Promise<SearchResult[]> {
  authorize(actor, "knowledge.search", { kind: "read" });
  const query = parseSearchQuery(request.query);
  const source = request.source ?? "all";
  const results: SearchResult[] = [];

  if (source !== "documents") {
    const notes = await db
      .select({
        id: treeNodes.id,
        title: treeNodes.title,
        slug: treeNodes.slug,
        excerpt: sql<string>`left(${treeNodes.contentMd}, 240)`,
        updatedAt: treeNodes.updatedAt,
      })
      .from(treeNodes)
      .innerJoin(branches, eq(treeNodes.branchId, branches.id))
      .where(
        and(
          ne(treeNodes.verification, "archived"),
          branchVisibilityCondition(actor),
          request.vaultId ? eq(branches.vaultId, request.vaultId) : undefined,
          querySql(query, "note"),
        ),
      )
      .orderBy(desc(treeNodes.updatedAt))
      .limit(RESULT_LIMIT);
    results.push(
      ...notes.map((note) => ({
        kind: "note" as const,
        id: note.id,
        title: note.title,
        excerpt: note.excerpt,
        href: `/tree/node/${note.id}`,
      })),
    );
  }

  if (source !== "notes" && !request.vaultId) {
    const visibleSpaces = scopedToSpaces(actor);
    const chunks =
      visibleSpaces !== null && visibleSpaces.length === 0
        ? []
        : await db
            .select({
              id: textChunks.id,
              sourceId: sources.id,
              title: sources.title,
              excerpt: sql<string>`left(${textChunks.content}, 240)`,
              refLabel: textChunks.refLabel,
              trustStatus: sources.trustStatus,
              createdAt: textChunks.createdAt,
            })
            .from(textChunks)
            .innerJoin(sourceVersions, eq(textChunks.sourceVersionId, sourceVersions.id))
            .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
            .where(
              and(
                visibleSpaces === null ? undefined : inArray(sources.spaceId, visibleSpaces),
                querySql(query, "chunk"),
              ),
            )
            .orderBy(desc(textChunks.createdAt))
            .limit(RESULT_LIMIT);
    results.push(
      ...chunks.map((chunk) => ({
        kind: "source_chunk" as const,
        id: chunk.id,
        title: chunk.title,
        excerpt: chunk.excerpt,
        href: `/library/${chunk.sourceId}`,
        refLabel: chunk.refLabel,
        trustStatus: chunk.trustStatus,
      })),
    );
  }

  return results.slice(0, RESULT_LIMIT);
}

export async function askLibrarian(
  actor: Principal,
  question: string,
  vaultId?: string,
): Promise<CitedAnswer> {
  const citations = await searchIndex(actor, { query: question, vaultId, source: "all" });
  if (!citations.length) {
    return {
      answer: "Không tìm thấy nội dung phù hợp trong phạm vi bạn được phép truy cập.",
      citations: [],
      model: process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
    };
  }
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
  const context = citations
    .map(
      (item, index) =>
        `[${index + 1}] ${item.title}${item.refLabel ? ` — ${item.refLabel}` : ""}\n${item.excerpt}`,
    )
    .join("\n\n");
  let response: Response;
  try {
    response = await fetch(`${process.env.OLLAMA_URL ?? "http://127.0.0.1:11434"}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Bạn là thủ thư. Chỉ trả lời từ ngữ cảnh được cung cấp. Dẫn nguồn bằng [1], [2]. Nếu thiếu bằng chứng, nói rõ là không đủ dữ liệu.",
          },
          { role: "user", content: `Câu hỏi: ${question}\n\nNgữ cảnh:\n${context}` },
        ],
      }),
    });
  } catch {
    throw new ApiError(
      503,
      "librarian_unavailable",
      "Thủ thư AI chưa sẵn sàng. Vui lòng khởi động Ollama rồi thử lại.",
    );
  }
  if (!response.ok) {
    throw new ApiError(
      503,
      "librarian_unavailable",
      `Thủ thư AI chưa sẵn sàng với model ${model}.`,
    );
  }
  const payload = (await response.json()) as { message?: { content?: string } };
  return {
    answer: payload.message?.content?.trim() || "Ollama không trả về nội dung.",
    citations,
    model,
  };
}

export const postgresIndexProvider: Pick<IndexProvider, "search" | "health"> = {
  async search(request, access) {
    return searchIndex(
      {
        userId: access.identityId,
        role: "user",
        spaceIds: access.spaceIds,
        spaceMemberships: access.spaceIds.map((spaceId) => ({
          spaceId,
          role: "viewer" as const,
        })),
        capabilities: access.systemCapabilities,
        vaultIds: access.vaultGrants.map((grant) => grant.vaultId),
        vaultGrants: access.vaultGrants,
      },
      request,
    );
  },
  async health() {
    await db.execute(sql`SELECT 1`);
    return { available: true };
  },
};

export const ollamaLibrarianProvider: LibrarianProvider = {
  async answer(question, access, vaultId) {
    return askLibrarian(
      {
        userId: access.identityId,
        role: "user",
        spaceIds: access.spaceIds,
        spaceMemberships: access.spaceIds.map((spaceId) => ({
          spaceId,
          role: "viewer" as const,
        })),
        capabilities: access.systemCapabilities,
        vaultIds: access.vaultGrants.map((grant) => grant.vaultId),
        vaultGrants: access.vaultGrants,
      },
      question,
      vaultId,
    );
  },
  async health() {
    try {
      const response = await fetch(
        `${process.env.OLLAMA_URL ?? "http://127.0.0.1:11434"}/api/tags`,
      );
      return { available: response.ok, message: response.ok ? undefined : `HTTP ${response.status}` };
    } catch (error) {
      return { available: false, message: error instanceof Error ? error.message : "unavailable" };
    }
  },
};

export { accessOf };
