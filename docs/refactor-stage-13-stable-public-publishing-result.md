# Stage 13 — Stable Public Note Publishing Foundation Result

## 1. Result

**PASS.** Stage 13 adds a first-class, per-Note publication identity, immutable public revisions, explicit Core-only publish/unpublish services, and an anonymous snapshot-only read DTO. No existing Note was published or backfilled.

## 2. Publication identity model

`note_publications.note_id` is both the primary key and a restrictive foreign key to `tree_nodes.id`. One authoritative internal Note can therefore have at most one stable public identity. `public_slug` is globally unique and remains reserved while the Note is unpublished.

The identity stores the current public revision pointer and availability timestamps. It is not a second mutable public Note.

## 3. Immutable public revision model

`note_public_revisions` stores only the public projection needed for a Note page: title, optional summary, Markdown content, publication time and lineage identifiers. It does not copy drafts, audit data, support relations, People, memberships or operational Project data.

The migration installs `note_public_revisions_append_only`, using the repository's existing `forbid_mutation()` function to reject `UPDATE` and `DELETE`. A publication change always creates a new revision.

## 4. Exact internal-version lineage

Every public revision has a restrictive FK to `tree_node_versions.id`. The `note_public_revisions_source_note` trigger additionally rejects a source version whose `node_id` differs from the public revision's Note. The service selects the latest complete immutable Note snapshot, validates its Markdown, and never snapshots mutable `tree_nodes` content.

The composite `note_publications_current_revision_fk` guarantees that `current_revision_id` belongs to the same Note publication.

## 5. Publish contract

`publishNote(actor, { noteId, publicSlug? })`:

- checks durable `tmkt.publish` membership inside the transaction;
- accepts only `tree_nodes.project_id` values resolving to confirmed Projects;
- rejects drafts, Personal/project-less Notes and unknown Notes;
- locks by Note identity;
- resolves the exact latest complete `TreeNodeVersion`;
- creates the publication identity and revision atomically;
- records `note.public.publish` with identifiers only.

Project membership, authorship, Project manager, `editor` and `admin_op` are not publication authority. Explicit Core may publish an official Note without Project membership but gains no edit authority from publishing.

## 6. Republish/no-change behavior

If the current internal source version differs, publish creates the next monotonic per-Note revision and atomically switches the current pointer. Earlier revisions remain immutable.

If the current public revision already points to the same source version, publish returns the existing revision with `changed: false`; it creates neither a revision nor an audit event. Note-level advisory locking plus database uniqueness prevents concurrent duplicate revision numbers or competing current state.

Internal Note edits do not touch `note_publications` or `note_public_revisions`; anonymous reads therefore remain on the old public revision until explicit republish.

## 7. Unpublish behavior

`unpublishNote(actor, noteId)` marks the publication unavailable and audits `note.public.unpublish`. It preserves the publication identity, slug, current pointer and all revision history. Repeated unpublish is idempotent.

Publishing unchanged content after unpublish reactivates the existing current revision without duplication. Publishing changed content creates the next revision and reactivates the publication.

## 8. Stable slug policy

Slugs are normalized to lowercase ASCII hyphen form and capped at 80 characters. An explicit collision returns `public_slug_taken`; an automatically derived collision receives a deterministic numeric suffix. Base-slug advisory locking and global uniqueness protect concurrent first publication.

Republish never changes the slug. Supplying a different slug for an existing publication returns `public_slug_immutable`. An unpublished Note continues to reserve its URL key. No route or redirect system was added.

## 9. Public read DTO/privacy

`getPublishedNoteBySlug(slug)` is anonymous and returns only the current immutable public revision:

```text
noteId
slug
revisionNumber
title
summary
contentMd
publishedAt
project: { id, name }
```

It returns not found when unpublished. It does not expose historical public revisions, internal User IDs, private drafts, research-support relations, audit data, Material files, Persons, memberships or Core state. Existing Markdown validation is reused before a revision is stored; presentation rendering remains a future delivery-layer concern.

## 10. Authorization

Publish and unpublish query explicit Core membership through `hasTmktCoreCapability(actor, "tmkt.publish", tx)` on every mutation. Revocation therefore affects the next operation immediately. No Project membership is synthesized and no current role is reinterpreted as Core.

Anonymous public reads need no internal authorization because they query only an available `note_publications` row joined to its current immutable revision.

## 11. WikiRelease compatibility

Existing whole-Space WikiRelease schema, services, routes and tests are unchanged. Stage 13 lives in a separate `publication` module and does not use Proposal/review approval as a publishing prerequisite.

## 12. Schema/migration

Migration: `drizzle/0045_stable_public_note_publishing.sql`

Added:

- `note_publications`;
- `note_public_revisions`;
- restrictive Note and `TreeNodeVersion` lineage FKs;
- global slug and per-Note revision/source uniqueness;
- same-Note current-revision constraint;
- source-version ownership trigger;
- append-only revision trigger;
- lookup indexes.

No INSERT, backfill or existing-row rewrite occurs.

## 13. Existing demo-data preservation

Normal local `wisdomtree` before/after migration:

| Object | Before | After |
| --- | ---: | ---: |
| Spaces | 7 | 7 |
| Projects | 1 | 1 |
| TreeNodes | 34 | 34 |
| Sources | 36 | 36 |
| Tasks | 2 | 2 |
| Note publications | absent | 0 |
| Public revisions | absent | 0 |

Migration head advanced from `0044_tmkt_core_foundation.sql` to `0045_stable_public_note_publishing.sql`. No demo Note was published.

## 14. Tests executed

Stateful tests used fresh isolated databases `wisdomtree_stage13_test_20260901` and `wisdomtree_stage13_test_final`, protected by matching `DATABASE_URL` and `TEST_DATABASE_URL`. Both were disposed after validation.

| Command | Result |
| --- | --- |
| Fresh migration chain through 0045 | PASS |
| Focused `zzz-stable-public-publishing.test.ts` | PASS |
| `npm run test:integration` | PASS — 17 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| `npm run build` | PASS — Next.js 15.5.22, 35 static pages |
| `git diff --check` | PASS |

Focused coverage includes role/Core authorization, Core without Project membership, private/project-less rejection, first publication, exact version lineage, anonymous DTO privacy, internal-edit isolation, immutable history, unchanged publish, unpublish/reactivation, changed republish, slug collisions/stability, concurrent publish, audit payloads and immediate Core revocation.

## 15. Files changed

Stage 13 files:

```text
src/db/schema.ts
src/modules/publication/index.ts
src/modules/publication/schema.ts
src/modules/publication/service.ts
drizzle/0045_stable_public_note_publishing.sql
tests/integration/zzz-stable-public-publishing.test.ts
docs/refactor-stage-13-stable-public-publishing-result.md
```

Accepted Stage 1–12 worktree changes remain present and were not cleaned or rewritten.

## 16. Compatibility gaps

- No `/n/<slug>` delivery route or publishing UI exists yet.
- Existing WikiRelease/public routes remain a separate legacy surface.
- Historical public revisions are retained internally but are not anonymously addressable.
- Public citation selection, bibliography, Person/byline policy and public Project facets beyond ID/name remain future product decisions.
- Public Markdown rendering/sanitization at the HTTP presentation boundary remains part of the future route/UI stage; stored content passes the existing Markdown validation gate.
- Slug rename/redirect is intentionally unsupported.
- Only the Vietnamese authoritative `TreeNodeVersion` path is published; translation publication policy is unresolved.

## 17. Recommended Stage 14

Implement a narrow **Cross-Project Discovery / Search Foundation** that indexes authorized official internal research for member/Core reads and immutable current public revisions for anonymous reads. Keep access filtering explicit, do not index private drafts or legacy Personal data, and do not make Graph the primary navigation.
