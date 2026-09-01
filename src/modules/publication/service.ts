import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, forbidden, notFound } from "@/lib/errors";
import { recordAudit } from "../audit/service";
import { hasTmktCoreCapability, requireProjectResearchRead } from "../auth/core";
import type { Principal } from "../auth/principal";
import { treeNodes, treeNodeVersions } from "../knowledge/schema";
import { assertSafeMarkdown } from "../knowledge/service-mutations";
import { projects } from "../project/schema";
import { spaces } from "../storage/schema";
import { notePublications, notePublicRevisions } from "./schema";

function normalizedSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requirePublish(actor: Principal, tx: Tx) {
  if (!(await hasTmktCoreCapability(actor, "tmkt.publish", tx))) throw forbidden();
}

async function publicationSlug(tx: Tx, title: string, requested?: string) {
  const base = normalizedSlug(requested ?? title);
  if (!base) throw new ApiError(400, "invalid_public_slug", "Public slug must not be empty.");
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`public:${base}`}, 0))`);

  if (requested !== undefined) {
    const [taken] = await tx
      .select({ noteId: notePublications.noteId })
      .from(notePublications)
      .where(eq(notePublications.publicSlug, base));
    if (taken) throw new ApiError(409, "public_slug_taken", "Public slug is already in use.");
    return base;
  }

  for (let suffix = 1; ; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = suffix === 1 ? base : `${base.slice(0, 80 - suffixText.length)}${suffixText}`;
    const [taken] = await tx
      .select({ noteId: notePublications.noteId })
      .from(notePublications)
      .where(eq(notePublications.publicSlug, candidate));
    if (!taken) return candidate;
  }
}

async function currentSource(tx: Tx, noteId: string) {
  const [note] = await tx
    .select({ id: treeNodes.id, projectId: treeNodes.projectId })
    .from(treeNodes)
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(eq(treeNodes.id, noteId));
  if (!note?.projectId) throw notFound();

  const [source] = await tx
    .select({
      id: treeNodeVersions.id,
      title: treeNodeVersions.title,
      summary: treeNodeVersions.summary,
      contentMd: treeNodeVersions.contentMd,
    })
    .from(treeNodeVersions)
    .where(and(eq(treeNodeVersions.nodeId, note.id), eq(treeNodeVersions.snapshotComplete, true)))
    .orderBy(desc(treeNodeVersions.seq))
    .limit(1);
  if (!source?.title) {
    throw new ApiError(409, "note_snapshot_unavailable", "No complete Note version is available.");
  }
  assertSafeMarkdown(source.contentMd);
  return {
    note: { id: note.id, projectId: note.projectId },
    source: { ...source, title: source.title },
  };
}

/** Publish the latest immutable internal Note version, or reactivate the current revision. */
export async function publishNote(
  actor: Principal,
  input: { noteId: string; publicSlug?: string },
) {
  return db.transaction(async (tx) => {
    await requirePublish(actor, tx);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.noteId}, 0))`);
    const { note, source } = await currentSource(tx, input.noteId);
    const [existing] = await tx
      .select()
      .from(notePublications)
      .where(eq(notePublications.noteId, note.id))
      .for("update");

    if (existing && input.publicSlug !== undefined) {
      const requested = normalizedSlug(input.publicSlug);
      if (!requested || requested !== existing.publicSlug) {
        throw new ApiError(
          409,
          "public_slug_immutable",
          "Changing an existing public slug is not supported.",
        );
      }
    }

    const [current] = existing?.currentRevisionId
      ? await tx
          .select()
          .from(notePublicRevisions)
          .where(eq(notePublicRevisions.id, existing.currentRevisionId))
      : [];
    if (existing && current?.sourceNoteVersionId === source.id) {
      if (existing.unpublishedAt === null) {
        return { publication: existing, revision: current, changed: false as const };
      }
      const now = new Date();
      const [publication] = await tx
        .update(notePublications)
        .set({
          publishedAt: now,
          unpublishedAt: null,
          updatedAt: now,
          version: existing.version + 1,
        })
        .where(eq(notePublications.noteId, note.id))
        .returning();
      await recordAudit(tx, actor, {
        accountability: "approver_publisher",
        action: "note.public.publish",
        targetType: "tree_node",
        targetId: note.id,
        details: {
          noteId: note.id,
          projectId: note.projectId,
          publicRevisionId: current.id,
          sourceNoteVersionId: source.id,
          revisionNumber: current.revisionNumber,
          slug: publication.publicSlug,
          reactivated: true,
        },
      });
      return { publication, revision: current, changed: true as const };
    }

    const now = new Date();
    if (!existing) {
      const slug = await publicationSlug(tx, source.title, input.publicSlug);
      await tx.insert(notePublications).values({ noteId: note.id, publicSlug: slug }).returning();
    }
    const [{ maxRevision }] = await tx
      .select({
        maxRevision: sql<number>`coalesce(max(${notePublicRevisions.revisionNumber}), 0)::int`,
      })
      .from(notePublicRevisions)
      .where(eq(notePublicRevisions.noteId, note.id));
    const [revision] = await tx
      .insert(notePublicRevisions)
      .values({
        noteId: note.id,
        revisionNumber: maxRevision + 1,
        sourceNoteVersionId: source.id,
        title: source.title,
        summary: source.summary,
        contentMd: source.contentMd,
        publishedBy: actor.userId,
        publishedAt: now,
      })
      .returning();
    const [publication] = await tx
      .update(notePublications)
      .set({
        currentRevisionId: revision.id,
        publishedAt: now,
        unpublishedAt: null,
        updatedAt: now,
        version: existing ? existing.version + 1 : 1,
      })
      .where(eq(notePublications.noteId, note.id))
      .returning();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "note.public.publish",
      targetType: "tree_node",
      targetId: note.id,
      details: {
        noteId: note.id,
        projectId: note.projectId,
        publicRevisionId: revision.id,
        sourceNoteVersionId: source.id,
        revisionNumber: revision.revisionNumber,
        slug: publication.publicSlug,
      },
    });
    return { publication, revision, changed: true as const };
  });
}

/** Hide a Note without deleting its publication identity or immutable history. */
export async function unpublishNote(actor: Principal, noteId: string) {
  return db.transaction(async (tx) => {
    await requirePublish(actor, tx);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${noteId}, 0))`);
    const [existing] = await tx
      .select()
      .from(notePublications)
      .where(eq(notePublications.noteId, noteId))
      .for("update");
    if (!existing) throw notFound();
    if (existing.unpublishedAt !== null) return { publication: existing, changed: false as const };
    const now = new Date();
    const [publication] = await tx
      .update(notePublications)
      .set({ unpublishedAt: now, updatedAt: now, version: existing.version + 1 })
      .where(eq(notePublications.noteId, noteId))
      .returning();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "note.public.unpublish",
      targetType: "tree_node",
      targetId: noteId,
      details: {
        noteId,
        publicRevisionId: publication.currentRevisionId,
        slug: publication.publicSlug,
      },
    });
    return { publication, changed: true as const };
  });
}

export type PublishedNoteDto = {
  noteId: string;
  slug: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  contentMd: string;
  publishedAt: Date;
  project: { id: string; name: string };
};

/** Anonymous read of only the current immutable public projection. */
export async function getPublishedNoteBySlug(slug: string): Promise<PublishedNoteDto> {
  const normalized = normalizedSlug(slug);
  if (!normalized) throw notFound();
  const [row] = await db
    .select({
      noteId: notePublications.noteId,
      slug: notePublications.publicSlug,
      revisionNumber: notePublicRevisions.revisionNumber,
      title: notePublicRevisions.title,
      summary: notePublicRevisions.summary,
      contentMd: notePublicRevisions.contentMd,
      publishedAt: notePublicRevisions.publishedAt,
      projectId: projects.projectId,
      projectName: spaces.name,
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
      and(eq(notePublications.publicSlug, normalized), isNull(notePublications.unpublishedAt)),
    );
  if (!row) throw notFound();
  return {
    noteId: row.noteId,
    slug: row.slug,
    revisionNumber: row.revisionNumber,
    title: row.title,
    summary: row.summary,
    contentMd: row.contentMd,
    publishedAt: row.publishedAt,
    project: { id: row.projectId, name: row.projectName },
  };
}

export type NotePublicationStatus = {
  state: "never_published" | "published_current" | "published_with_changes" | "unpublished";
  slug: string | null;
  revisionNumber: number | null;
  sourceNoteVersionId: string | null;
  hasUnpublishedChanges: boolean;
};

/** Internal publication state composed from immutable source-version identity. */
export async function getNotePublicationStatus(
  actor: Principal,
  projectId: string,
  noteId: string,
): Promise<NotePublicationStatus> {
  await requireProjectResearchRead(actor, projectId);
  const [note] = await db
    .select({ id: treeNodes.id })
    .from(treeNodes)
    .where(and(eq(treeNodes.id, noteId), eq(treeNodes.projectId, projectId)));
  if (!note) throw notFound();
  const [latest] = await db
    .select({ id: treeNodeVersions.id })
    .from(treeNodeVersions)
    .where(and(eq(treeNodeVersions.nodeId, note.id), eq(treeNodeVersions.snapshotComplete, true)))
    .orderBy(desc(treeNodeVersions.seq))
    .limit(1);
  const [publication] = await db
    .select({
      slug: notePublications.publicSlug,
      unpublishedAt: notePublications.unpublishedAt,
      revisionNumber: notePublicRevisions.revisionNumber,
      sourceNoteVersionId: notePublicRevisions.sourceNoteVersionId,
    })
    .from(notePublications)
    .leftJoin(notePublicRevisions, eq(notePublicRevisions.id, notePublications.currentRevisionId))
    .where(eq(notePublications.noteId, note.id));
  if (!publication) {
    return {
      state: "never_published",
      slug: null,
      revisionNumber: null,
      sourceNoteVersionId: null,
      hasUnpublishedChanges: false,
    };
  }
  const hasUnpublishedChanges = latest?.id !== publication.sourceNoteVersionId;
  return {
    state: publication.unpublishedAt
      ? "unpublished"
      : hasUnpublishedChanges
        ? "published_with_changes"
        : "published_current",
    slug: publication.slug,
    revisionNumber: publication.revisionNumber,
    sourceNoteVersionId: publication.sourceNoteVersionId,
    hasUnpublishedChanges,
  };
}
