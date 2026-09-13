import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { researchReadableProjectIds } from "../auth/core";
import type { Principal } from "../auth/principal";
import { activities } from "../activity/schema";
import { treeNodes } from "../knowledge/schema";
import { persons, projectPeople } from "../person/schema";
import { projects } from "../project/schema";
import { notePublications, notePublicRevisions } from "../publication/schema";
import { sources, spaces, textChunks } from "../storage/schema";

const SEARCH_TYPES = ["project", "note", "material", "activity", "person"] as const;
type SearchType = (typeof SEARCH_TYPES)[number];
type ProjectContext = { id: string; name: string };

export type InternalResearchSearchResult =
  | {
      kind: "project";
      id: string;
      title: string;
      summary: string | null;
      project: ProjectContext;
      isPersonal: boolean;
      score: number;
    }
  | {
      kind: "note" | "material" | "activity";
      id: string;
      title: string;
      summary: string | null;
      project: ProjectContext;
      score: number;
    }
  | {
      kind: "person";
      id: string;
      title: string;
      summary: string | null;
      projects: ProjectContext[];
      score: number;
    };

export type PublishedNoteSearchResult = {
  noteId: string;
  slug: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  publishedAt: Date;
  project: ProjectContext;
  score: number;
};

function searchQuery(value: string | undefined) {
  const query = value?.trim();
  if (!query) throw new ApiError(400, "invalid_search_query", "A search query is required.");
  if (query.length > 200) {
    throw new ApiError(400, "invalid_search_query", "Search query must be at most 200 characters.");
  }
  return query;
}

function searchLimit(value: number | undefined) {
  const limit = value ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ApiError(400, "invalid_search_limit", "Search limit must be between 1 and 50.");
  }
  return limit;
}

function selectedTypes(values: SearchType[] | undefined) {
  if (!values) return new Set<SearchType>(SEARCH_TYPES);
  if (values.some((value) => !SEARCH_TYPES.includes(value))) {
    throw new ApiError(400, "invalid_search_type", "Unsupported research search type.");
  }
  return new Set(values);
}

function rankResults(a: InternalResearchSearchResult, b: InternalResearchSearchResult) {
  return b.score - a.score || a.id.localeCompare(b.id);
}

/** Search only official research in confirmed Projects currently readable by the actor. */
export async function searchInternalResearch(
  actor: Principal,
  input: {
    query?: string;
    types?: SearchType[];
    projectIds?: string[];
    limit?: number;
  },
): Promise<InternalResearchSearchResult[]> {
  const query = searchQuery(input.query);
  const limit = searchLimit(input.limit);
  const types = selectedTypes(input.types);
  const readableIds = await researchReadableProjectIds(actor);
  const requested = input.projectIds ? new Set(input.projectIds) : null;
  const projectIds = readableIds.filter((id) => !requested || requested.has(id));
  if (!projectIds.length || !types.size) return [];

  const tsQuery = sql`plainto_tsquery('simple', immutable_unaccent(${query}))`;
  const projectNameVector = sql`setweight(to_tsvector('simple', immutable_unaccent(
    ${spaces.name} || CASE
      WHEN ${projects.personalOwnerId} = ${actor.userId} THEN ' Dự án của tôi My Project'
      ELSE ''
    END
  )), 'A')`;
  const projectResearchVector = sql`
    setweight(to_tsvector('simple', immutable_unaccent(${projects.researchLens})), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${projects.description}, ''))), 'C')`;
  const noteVector = sql`
    setweight(to_tsvector('simple', immutable_unaccent(${treeNodes.title})), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${treeNodes.summary}, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(${treeNodes.contentMd})), 'C')`;
  const materialVector = sql`
    setweight(to_tsvector('simple', immutable_unaccent(${sources.title})), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${sources.description}, ''))), 'B')`;
  const personVector = sql`
    setweight(to_tsvector('simple', immutable_unaccent(${persons.displayName})), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${persons.summary}, ''))), 'B')`;
  // Activities are operational workspaces. Do not widen their visibility for
  // Core research readers who lack a real membership in the Project.
  const operationalProjectIds = actor.spaceMemberships
    .map((membership) => membership.spaceId)
    .filter((id) => projectIds.includes(id));
  const activityVector = sql`
    setweight(to_tsvector('simple', immutable_unaccent(${activities.title})), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${activities.activityType}, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${activities.summary}, ''))), 'C')`;

  const [projectRows, noteRows, materialRows, activityRows, personRows] = await Promise.all([
    types.has("project")
      ? db
          .select({
            kind: sql<"project">`'project'`,
            id: projects.projectId,
            title: spaces.name,
            summary: projects.description,
            projectId: projects.projectId,
            projectName: spaces.name,
            isPersonal: sql<boolean>`${projects.personalOwnerId} = ${actor.userId}`,
            score: sql<number>`
              ts_rank(${projectNameVector}, ${tsQuery}) +
              ts_rank(${projectResearchVector}, ${tsQuery})`,
          })
          .from(projects)
          .innerJoin(spaces, eq(spaces.id, projects.projectId))
          .where(
            and(
              inArray(projects.projectId, projectIds),
              sql`(${projectNameVector} @@ ${tsQuery} OR ${projectResearchVector} @@ ${tsQuery})`,
            ),
          )
          .orderBy(
            desc(
              sql`ts_rank(${projectNameVector}, ${tsQuery}) + ts_rank(${projectResearchVector}, ${tsQuery})`,
            ),
            asc(projects.projectId),
          )
          .limit(limit)
      : Promise.resolve([]),
    types.has("note")
      ? db
          .select({
            kind: sql<"note">`'note'`,
            id: treeNodes.id,
            title: treeNodes.title,
            summary: treeNodes.summary,
            projectId: projects.projectId,
            projectName: spaces.name,
            score: sql<number>`ts_rank(${noteVector}, ${tsQuery})`,
          })
          .from(treeNodes)
          .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
          .innerJoin(spaces, eq(spaces.id, projects.projectId))
          .where(
            and(
              inArray(treeNodes.projectId, projectIds),
              ne(treeNodes.verification, "archived"),
              sql`${noteVector} @@ ${tsQuery}`,
            ),
          )
          .orderBy(desc(sql`ts_rank(${noteVector}, ${tsQuery})`), asc(treeNodes.id))
          .limit(limit)
      : Promise.resolve([]),
    types.has("material")
      ? db
          .select({
            kind: sql<"material">`'material'`,
            id: sources.id,
            title: sources.title,
            summary: sources.description,
            projectId: projects.projectId,
            projectName: spaces.name,
            score: sql<number>`greatest(
              ts_rank(${materialVector}, ${tsQuery}),
              coalesce((
                SELECT max(ts_rank(${textChunks}.tsv, ${tsQuery})) * 0.1
                FROM ${textChunks}
                WHERE ${textChunks.sourceVersionId} = ${sources.currentVersionId}
                  AND ${textChunks}.tsv @@ ${tsQuery}
              ), 0)
            )`,
          })
          .from(sources)
          .innerJoin(projects, eq(projects.projectId, sources.spaceId))
          .innerJoin(spaces, eq(spaces.id, projects.projectId))
          .where(
            and(
              inArray(sources.spaceId, projectIds),
              ne(sources.trustStatus, "archived"),
              sql`(
                ${materialVector} @@ ${tsQuery}
                OR EXISTS (
                  SELECT 1 FROM ${textChunks}
                  WHERE ${textChunks.sourceVersionId} = ${sources.currentVersionId}
                    AND ${textChunks}.tsv @@ ${tsQuery}
                )
              )`,
            ),
          )
          .orderBy(
            desc(sql`greatest(
              ts_rank(${materialVector}, ${tsQuery}),
              coalesce((
                SELECT max(ts_rank(${textChunks}.tsv, ${tsQuery})) * 0.1
                FROM ${textChunks}
                WHERE ${textChunks.sourceVersionId} = ${sources.currentVersionId}
                  AND ${textChunks}.tsv @@ ${tsQuery}
              ), 0)
            )`),
            asc(sources.id),
          )
          .limit(limit)
      : Promise.resolve([]),
    types.has("activity") && operationalProjectIds.length
      ? db
          .select({
            kind: sql<"activity">`'activity'`,
            id: activities.id,
            title: activities.title,
            summary: activities.summary,
            projectId: projects.projectId,
            projectName: spaces.name,
            score: sql<number>`ts_rank(${activityVector}, ${tsQuery})`,
          })
          .from(activities)
          .innerJoin(projects, eq(projects.projectId, activities.projectId))
          .innerJoin(spaces, eq(spaces.id, projects.projectId))
          .where(
            and(
              inArray(activities.projectId, operationalProjectIds),
              sql`${activityVector} @@ ${tsQuery}`,
            ),
          )
          .orderBy(desc(sql`ts_rank(${activityVector}, ${tsQuery})`), asc(activities.id))
          .limit(limit)
      : Promise.resolve([]),
    types.has("person")
      ? db
          .select({
            kind: sql<"person">`'person'`,
            id: persons.id,
            title: persons.displayName,
            summary: persons.summary,
            score: sql<number>`ts_rank(${personVector}, ${tsQuery})`,
          })
          .from(persons)
          .innerJoin(projectPeople, eq(projectPeople.personId, persons.id))
          .where(
            and(inArray(projectPeople.projectId, projectIds), sql`${personVector} @@ ${tsQuery}`),
          )
          .groupBy(persons.id)
          .orderBy(desc(sql`ts_rank(${personVector}, ${tsQuery})`), asc(persons.id))
          .limit(limit)
      : Promise.resolve([]),
  ]);

  const personIds = personRows.map((person) => person.id);
  const contextRows = personIds.length
    ? await db
        .select({
          personId: projectPeople.personId,
          projectId: projects.projectId,
          projectName: spaces.name,
        })
        .from(projectPeople)
        .innerJoin(projects, eq(projects.projectId, projectPeople.projectId))
        .innerJoin(spaces, eq(spaces.id, projects.projectId))
        .where(
          and(
            inArray(projectPeople.personId, personIds),
            inArray(projectPeople.projectId, projectIds),
          ),
        )
        .orderBy(asc(projectPeople.personId), asc(projects.projectId))
    : [];
  const contexts = new Map<string, ProjectContext[]>();
  for (const row of contextRows) {
    const values = contexts.get(row.personId) ?? [];
    values.push({ id: row.projectId, name: row.projectName });
    contexts.set(row.personId, values);
  }

  const results: InternalResearchSearchResult[] = [
    ...projectRows.map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      summary: row.summary,
      project: { id: row.projectId, name: row.projectName },
      isPersonal: row.isPersonal,
      score: Number(row.score),
    })),
    ...noteRows.map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      summary: row.summary,
      project: { id: row.projectId, name: row.projectName },
      score: Number(row.score),
    })),
    ...materialRows.map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      summary: row.summary,
      project: { id: row.projectId, name: row.projectName },
      score: Number(row.score),
    })),
    ...activityRows.map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      summary: row.summary,
      project: { id: row.projectId, name: row.projectName },
      score: Number(row.score),
    })),
    ...personRows.map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      summary: row.summary,
      projects: contexts.get(row.id) ?? [],
      score: Number(row.score),
    })),
  ];
  return results.sort(rankResults).slice(0, limit);
}

/** Anonymous search over only the current available immutable public revision. */
export async function searchPublishedNotes(input: {
  query?: string;
  projectIds?: string[];
  limit?: number;
}): Promise<PublishedNoteSearchResult[]> {
  const query = searchQuery(input.query);
  const limit = searchLimit(input.limit);
  if (input.projectIds?.length === 0) return [];
  const tsQuery = sql`plainto_tsquery('simple', immutable_unaccent(${query}))`;
  const vector = sql`
    setweight(to_tsvector('simple', immutable_unaccent(${notePublicRevisions.title})), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(${notePublicRevisions.summary}, ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(${notePublicRevisions.contentMd})), 'C')`;
  const rows = await db
    .select({
      noteId: notePublications.noteId,
      slug: notePublications.publicSlug,
      revisionNumber: notePublicRevisions.revisionNumber,
      title: notePublicRevisions.title,
      summary: notePublicRevisions.summary,
      publishedAt: notePublicRevisions.publishedAt,
      projectId: projects.projectId,
      projectName: spaces.name,
      score: sql<number>`ts_rank(${vector}, ${tsQuery})`,
    })
    .from(notePublications)
    .innerJoin(
      notePublicRevisions,
      and(
        eq(notePublicRevisions.noteId, notePublications.noteId),
        eq(notePublicRevisions.id, notePublications.currentRevisionId),
      ),
    )
    .innerJoin(treeNodes, eq(treeNodes.id, notePublications.noteId))
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .innerJoin(spaces, eq(spaces.id, projects.projectId))
    .where(
      and(
        isNull(notePublications.unpublishedAt),
        input.projectIds?.length ? inArray(projects.projectId, input.projectIds) : undefined,
        sql`${vector} @@ ${tsQuery}`,
      ),
    )
    .orderBy(desc(sql`ts_rank(${vector}, ${tsQuery})`), asc(notePublications.noteId))
    .limit(limit);
  return rows.map((row) => ({
    noteId: row.noteId,
    slug: row.slug,
    revisionNumber: row.revisionNumber,
    title: row.title,
    summary: row.summary,
    publishedAt: row.publishedAt,
    project: { id: row.projectId, name: row.projectName },
    score: Number(row.score),
  }));
}
