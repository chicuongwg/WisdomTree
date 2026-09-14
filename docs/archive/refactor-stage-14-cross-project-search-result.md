# Stage 14 — Cross-Project Discovery / Search Foundation Result

## 1. Result

**PASS.** WisdomTree now has two explicit, source-table-backed text search boundaries:

```text
searchInternalResearch(actor, ...)
searchPublishedNotes(...)
```

Internal search is limited to authorized confirmed-Project research. Anonymous search reads only the current available immutable public Note revision. Existing demo records were indexed structurally but were not classified, merged, moved or rewritten.

## 2. Search architecture

Search runs directly against canonical PostgreSQL tables with functional GIN indexes. There is no search-document table, synchronization worker, external search service, vector store, Graph edge or search analytics domain.

Internal and public search are separate service functions with separate DTOs and source sets. Legacy `searchTree` and `searchKnowledge` remain unchanged for compatibility.

## 3. Internal searchable entity types

The target internal service supports:

- `project`: confirmed Project name, research lens and description;
- `note`: current official authoritative Project Note title, summary and content;
- `material`: Project Material title, description and extracted chunks belonging to its current `SourceVersion`;
- `person`: canonical Person display name and summary, returned once per Person ID.

Drafts, Activities, Tasks, Deadlines, Proposals, ExtractionCandidates, Personal/legacy Spaces, project-less Notes, audit and circulation rows are not queried.

## 4. Internal authorization model

Every call obtains durable scope from `researchReadableProjectIds(actor)` before querying research tables. The resulting confirmed Project IDs are placed in each SQL query. Optional caller `projectIds` are intersected with that scope and cannot expand it.

Ordinary Users search only Projects with durable membership. Explicit Core searches all confirmed Projects. Core revocation takes effect on the next call because Core and membership scope are read from the database, not cached in the Principal.

Person context is also constrained in SQL. A canonical Person linked to several readable Projects appears once and carries only those readable Project contexts.

## 5. PostgreSQL text-search strategy

Migration `0046_cross_project_search.sql` adds six functional GIN indexes over canonical fields:

```text
spaces Project names
Project research metadata
authoritative Project Notes
Project Materials
canonical Persons
immutable public revisions
```

Existing `text_chunks.tsv` and its GIN index are reused for current Material extraction text. A Material remains one result; historical `SourceVersion` and chunk rows never become independent hits.

Queries use parameterized `plainto_tsquery`, so punctuation and search syntax cannot become raw PostgreSQL query syntax.

## 6. Vietnamese search decision

The existing deployment already provides:

```text
unaccent extension
immutable_unaccent(text)
simple text-search configuration
```

Stage 14 reuses those verified primitives. Vietnamese text is tokenized without pretending English stemming is correct, and accent-insensitive matching works, including `Kiến trúc Huế` queried as `kien truc hue`. No new extension or deployment dependency was introduced.

## 7. Ranking/result DTO

Weights are deterministic:

```text
name/title                  A
summary/lens/Material desc  B
Project description/body    C
Material chunks             lower than Material metadata
```

Results are ordered by score descending and stable ID ascending. Search defaults to 20 results and rejects limits outside 1–50. Queries are trimmed, empty input is rejected and length is capped at 200 characters.

Internal results are discriminated by `kind`. Project, Note and Material results contain one Project context. Person results contain only readable Project contexts. Raw ORM rows, User IDs, memberships, object keys, download tokens and provenance are not returned.

## 8. Project/Note/Material/Person behavior

- Project results require a confirmed `projects` row.
- Note results require authoritative `tree_nodes.project_id`, a confirmed Project join and non-archived official state.
- Material results require `sources.space_id` to join a confirmed Project and exclude archived Materials.
- Person results require an authorized `project_people` relation and deduplicate only by canonical Person ID.
- Same-titled Notes/Materials and similarly named Persons remain distinct identities.
- Canonical writes are visible immediately because queries read source tables directly.

## 9. Anonymous public search model

`searchPublishedNotes` requires no Principal and searches only:

```text
note_publications
→ current_revision_id
→ note_public_revisions
WHERE unpublished_at IS NULL
```

The anonymous DTO contains Note ID, stable slug, revision number, title, summary, publication time, Project ID/name facet and score. It deliberately omits Markdown body, internal identities and operational metadata.

An optional Project ID list acts only as a facet. Project hierarchy is not required.

## 10. Public revision consistency

Public search never queries mutable internal Note content. Internal edits leave the current public revision searchable until explicit republish changes `current_revision_id`.

Unpublish removes the Note from anonymous search immediately. Republish restores the current revision immediately. Historical revisions are retained by Stage 13 but never returned as separate search hits.

## 11. Privacy exclusions

Focused tests use distinctive phrases to prove zero target-search exposure from:

- another author's private Project draft;
- Personal Note;
- project-less legacy Team Note;
- Personal Material;
- unconfirmed Team Space Material;
- unpublished/internal-only research in anonymous search.

Core does not bypass these exclusions. Public search cannot return Materials, Persons, Tasks, Activities, memberships, Core data or historical public revisions because those tables are absent from its query.

## 12. Migration/indexing

Migration: `drizzle/0046_cross_project_search.sql`

It creates only functional GIN indexes. It creates no domain/search rows, generated ownership, triggers, projection tables or backfill. The migration was validated from a fresh database through the entire migration chain.

## 13. Existing DB preservation

Normal local `wisdomtree` before/after migration:

| Object | Before | After |
| --- | ---: | ---: |
| Projects | 1 | 1 |
| TreeNodes | 34 | 34 |
| Sources | 36 | 36 |
| Persons | 0 | 0 |
| Activities | 0 | 0 |
| Tasks | 2 | 2 |
| Note publications | 0 | 0 |
| Public revisions | 0 | 0 |
| Stage 14 indexes | 0 | 6 |

Migration head advanced from `0045_stable_public_note_publishing.sql` to `0046_cross_project_search.sql`.

## 14. Tests executed

All stateful tests used isolated databases protected by matching `DATABASE_URL` and `TEST_DATABASE_URL`. Both test databases were disposed afterward.

| Command | Result |
| --- | --- |
| Fresh migration chain through 0046 | PASS |
| Focused `zzzz-cross-project-search.test.ts` | PASS |
| `npm run test:integration` | PASS — 18 files |
| `npm run test:usecase` | PASS — 3 files |
| `npm run test:privacy` | PASS — 2 files |
| `npm test` | PASS — lint, typecheck, 8 unit files, boundaries, signing, time and contrast |
| `npm run build` | PASS — Next.js 15.5.22, 35 static pages |
| `git diff --check` | PASS |

Focused coverage includes Project scope intersection, member/Core/revocation behavior, four entity kinds, canonical Person deduplication and visible contexts, accent-insensitive Vietnamese search, weighted title/body ranking, deterministic ordering, private/legacy exclusions, malformed queries, public revision isolation, republish, unpublish and anonymous DTO privacy.

## 15. Files changed

Stage 14 files:

```text
src/modules/search/index.ts
src/modules/search/service.ts
drizzle/0046_cross_project_search.sql
tests/integration/zzzz-cross-project-search.test.ts
docs/refactor-stage-14-cross-project-search-result.md
```

Accepted Stage 1–13 worktree changes remain present and were not cleaned or rewritten.

## 16. Compatibility gaps

- No target search route, Project search UI or public Explore UI exists.
- Legacy `/api/search`, Tree search and old search UI retain legacy semantics.
- Tags and translations are not included in the target search vectors yet.
- Material extracted-text relevance uses only the current `SourceVersion`; metadata-only Materials remain searchable by title/description.
- No snippets/highlighting, cursor pagination, semantic similarity, typo tolerance or fuzzy Person matching exists.
- Functional indexes are built by a normal transactional migration; a future large production dataset may require an operational concurrent-index deployment plan.
- Public Project name remains display metadata returned with results, not part of public Note text ranking.

## 17. Recommended Stage 15

Implement a narrow **Tempo capability cleanup**:

```text
Tempo
= ordinary confirmed Project
+ library_circulation capability
+ Project-scoped library operator authority
```

Remove remaining product dependence on hard-coded library Space semantics and global library-operator assumptions without changing Project ownership, adding UI redesign or making Library a top-level peer to Project.
